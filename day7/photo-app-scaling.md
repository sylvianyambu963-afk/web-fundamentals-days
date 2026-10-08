# SnapShare Scaling Plan

## Assumptions

* SnapShare has 10 million registered users.
* 10% of registered users are active each day.
* Each daily active user uploads 1 photo per day.
* Each daily active user views 50 feed pages per day.
* The average photo is 2 MB.
* Each photo also has a 50 KB thumbnail.
* A day has 86,400 seconds.
* For peak traffic, I assume peak feed traffic is 5 times the average.
* Storage calculations use decimal units for simplicity: 1 TB = 1,000 GB.

### Daily active users

10,000,000 × 10% = **1,000,000 daily active users**

---

## 1. Traffic and Storage Estimates

### Uploads per second

There are 1,000,000 daily active users, and each uploads 1 photo per day.

Daily uploads:

1,000,000 × 1 = **1,000,000 photos/day**

Average uploads per second:

1,000,000 ÷ 86,400 ≈ **11.6 uploads/second**

So SnapShare needs to handle approximately **12 photo uploads per second on average**.

### Feed views per second

Each active user views 50 feed pages per day.

Daily feed views:

1,000,000 × 50 = **50,000,000 feed views/day**

Average feed views per second:

50,000,000 ÷ 86,400 ≈ **579 feed views/second**

Peak feed views using 5×:

579 × 5 ≈ **2,894 feed views/second**

So the system should be designed for approximately **579 feed views/second on average and 2,900 feed views/second at peak**.

### Photo storage per year

Each photo requires:

* Original photo = 2 MB
* Thumbnail = 50 KB = 0.05 MB
* Total = **2.05 MB per photo**

Daily storage:

1,000,000 × 2.05 MB = **2,050,000 MB/day**

This is approximately **2.05 TB/day**.

Yearly storage:

2.05 TB × 365 = **748.25 TB/year**

Therefore, SnapShare needs approximately **748 TB of new photo and thumbnail storage per year**, before accounting for backups, replication, and other overhead.

---

## 2. Read-Heavy or Write-Heavy?

SnapShare is **read-heavy**.

Each daily active user uploads only 1 photo but views 50 feed pages per day. This means the system performs many more feed reads than photo uploads.

Because the system is read-heavy, the design should focus on handling large numbers of reads efficiently. Caching, a CDN, database read replicas, and horizontally scalable app servers can reduce the load on the main database and improve response times.

---

## 3. Why Photos Should Not Be Stored Inside the Database

The actual photo files should not be stored directly inside the database because large binary files would make the database much larger, harder to back up, and more expensive to scale.

Instead, the original photos and thumbnails should be stored in **object storage**, while the database stores metadata such as the photo ID, owner, caption, timestamp, and the object's storage key or URL.

A CDN can then serve frequently requested photos and thumbnails quickly to users.

---

## 4. Architecture Diagram

```text
                         ┌───────────────┐
                         │    Users      │
                         └───────┬───────┘
                                 │
                                 ▼
                         ┌───────────────┐
                         │     CDN       │
                         └───────┬───────┘
                                 │
                    ┌────────────▼────────────┐
                    │     Load Balancer       │
                    └────────────┬────────────┘
                                 │
                ┌────────────────┼────────────────┐
                │                │                │
                ▼                ▼                ▼
        ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
        │ App Server 1 │ │ App Server 2 │ │ App Server 3 │
        └──────┬───────┘ └──────┬───────┘ └──────┬───────┘
               │                │                │
               └────────────────┼────────────────┘
                                │
                    ┌───────────▼───────────┐
                    │         Cache         │
                    │        (Redis)        │
                    └───────────┬───────────┘
                                │
                         ┌──────▼──────┐
                         │  Database   │
                         │   Primary   │
                         └──────┬──────┘
                                │
                         ┌──────▼──────┐
                         │ Read Replica │
                         └─────────────┘


        Photo Upload
             │
             ▼
    ┌──────────────────┐
    │  Object Storage  │
    │ Original Photos  │
    │ + Thumbnails     │
    └────────┬─────────┘
             │
             │
             ▼
        ┌─────────┐
        │  Queue  │
        └────┬────┘
             │
             ▼
       ┌───────────┐
       │  Worker   │
       │ Thumbnail │
       │ Generator │
       └───────────┘
             │
             ▼
      Object Storage
```

---

## 5. What Each Component Solves

* **CDN:** Serves photos and thumbnails from locations close to users, reducing latency and load on the application servers.
* **Load Balancer:** Distributes incoming requests across multiple app servers so that one server does not become overloaded.
* **App Servers:** Run the SnapShare application logic, authenticate users, handle uploads, and generate feed responses.
* **Cache (Redis):** Stores frequently requested data such as feed information so that repeated reads do not always hit the database.
* **Primary Database:** Stores structured application data such as users, follows, posts, captions, timestamps, and photo metadata.
* **Read Replica:** Handles database read traffic separately from the primary database, allowing the system to scale read-heavy workloads.
* **Object Storage:** Stores the large original photo files and thumbnail files efficiently without putting them inside the database.
* **Queue:** Holds thumbnail-generation jobs so that image processing can happen asynchronously without making the upload request wait.
* **Worker:** Takes jobs from the queue and creates thumbnails from uploaded photos.

---

## 6. Photo Upload Flow

1. The user selects a photo in the SnapShare application.
2. The app server authenticates the user and validates the upload.
3. The original photo is uploaded to object storage.
4. The application creates a database record containing the photo metadata and the object's storage key.
5. The application places a thumbnail-generation job containing the photo's storage location into the queue.
6. The server responds to the user that the photo has been uploaded successfully.
7. A worker takes the thumbnail job from the queue.
8. The worker downloads or accesses the original photo from object storage.
9. The worker creates the 50 KB thumbnail.
10. The worker stores the thumbnail in object storage.
11. The worker updates the database with the thumbnail's storage key or URL.
12. Future feed requests can use the thumbnail, which can also be served efficiently through the CDN.

---

## 7. Trade-Offs

### Trade-off 1: Cache vs Fresh Data

Caching feed data makes the application faster and reduces database load, but cached data can become stale. The system therefore needs cache invalidation or short expiration times, which adds complexity.

### Trade-off 2: Read Replicas vs Consistency

Read replicas allow many more feed reads to be handled, but replication can have a small delay. A user might briefly see slightly older data on a feed after creating a new post.

### Trade-off 3: Asynchronous Thumbnails vs Immediate Availability

Using a queue and worker makes photo uploads faster because thumbnail creation happens in the background. However, the thumbnail may not be available immediately after the upload.

### Trade-off 4: Object Storage vs Simplicity

Object storage is much better for large photo files and scales well, but it introduces another service that must be managed and integrated with the application.

---

## Conclusion

SnapShare should use a horizontally scalable, read-heavy architecture. A CDN, cache, load balancer, multiple app servers, database read replica, object storage, and asynchronous thumbnail processing allow the application to handle approximately 2,900 peak feed views per second while storing hundreds of terabytes of new photo data each year.
