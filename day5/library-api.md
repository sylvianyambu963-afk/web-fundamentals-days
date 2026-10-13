# Library API Design

## 1. Overview

The Library API allows clients to retrieve, create, update, delete, and search for books in a library system.

**Base URL:** `/api/books`

**Data format:** JSON

## 2. Book Data Structure

Each book contains:

```json
{
  "id": 1,
  "title": "Things Fall Apart",
  "author": "Chinua Achebe",
  "publishedYear": 1958,
  "available": true
}
```

## 3. API Endpoints

### Endpoint 1: Get All Books

- **Method:** GET
- **URL:** `/api/books`
- **Purpose:** Returns all books in the library.
- **Success status:** `200 OK`

Example response:

```json
[
  {
    "id": 1,
    "title": "Things Fall Apart",
    "author": "Chinua Achebe",
    "publishedYear": 1958,
    "available": true
  }
]
```

### Endpoint 2: Get a Book by ID

- **Method:** GET
- **URL:** `/api/books/{id}`
- **Purpose:** Retrieves one book using its ID.
- **Success status:** `200 OK`
- **Error status:** `404 Not Found` if the book does not exist.

Example request:

`GET /api/books/1`

### Endpoint 3: Create a Book

- **Method:** POST
- **URL:** `/api/books`
- **Purpose:** Adds a new book to the library.
- **Success status:** `201 Created`
- **Error status:** `400 Bad Request` if required fields are missing or invalid.

Example request body:

```json
{
  "title": "The River and the Source",
  "author": "Margaret Ogola",
  "publishedYear": 1994,
  "available": true
}
```

The server validates the input, creates the book, assigns a unique ID, and returns the created record.

### Endpoint 4: Update a Book

- **Method:** PUT
- **URL:** `/api/books/{id}`
- **Purpose:** Replaces the editable details of an existing book.
- **Success status:** `200 OK`
- **Error status:** `400 Bad Request` if the submitted data is invalid.
- **Error status:** `404 Not Found` if the book ID does not exist.

Example request:

`PUT /api/books/1`

Example request body:

```json
{
  "title": "Things Fall Apart",
  "author": "Chinua Achebe",
  "publishedYear": 1958,
  "available": false
}
```

The server validates the submitted fields, updates the existing record, and returns the updated book.

### Endpoint 5: Delete a Book

- **Method:** DELETE
- **URL:** `/api/books/{id}`
- **Purpose:** Removes a book from the library.
- **Success status:** `204 No Content`
- **Error status:** `404 Not Found` if the book ID does not exist.

Example request:

`DELETE /api/books/1`

On success, the server deletes the book and returns an empty response body with status `204 No Content`.

### Endpoint 6: Filter Books by Author

- **Method:** GET
- **URL:** `/api/books?author={name}`
- **Purpose:** Returns books written by the specified author.
- **Success status:** `200 OK`

Example request:

`GET /api/books?author=Chinua%20Achebe`

Example response:

```json
[
  {
    "id": 1,
    "title": "Things Fall Apart",
    "author": "Chinua Achebe",
    "publishedYear": 1958,
    "available": true
  }
]
```

The server compares the author query parameter with stored author names. If no books match, it returns `200 OK` with an empty array.

## 4. HTTP Status Codes

### 200 OK
The request succeeded. Used when retrieving or updating a book.

### 201 Created
A new book was successfully created.

### 204 No Content
A book was successfully deleted. The response contains no body.

### 400 Bad Request
The request contains missing, malformed, or invalid data.

Examples:
- A POST request has no title.
- The `publishedYear` value is not a valid year.
- A PUT request contains invalid field values.

Example error response:

```json
{
  "error": {
    "code": "BAD_REQUEST",
    "message": "The title and author fields are required."
  }
}
```

### 404 Not Found
The requested book does not exist.

Examples:
- A client requests `GET /api/books/999` when book 999 is absent.
- A client attempts to update or delete a nonexistent book.

Example error response:

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Book not found."
  }
}
```

## 5. Validation and Error Handling

The API should validate incoming data before creating or updating a book.

Validation rules:
- `title` must be a non-empty string.
- `author` must be a non-empty string.
- `publishedYear` must be a valid year if supplied.
- `available` must be a Boolean when supplied.

The API returns an appropriate HTTP status code and a clear JSON error message when a request fails. It should not expose internal server details in error responses.

## 6. Summary

The Library API supports retrieving all books, retrieving a single book, creating books, updating books, deleting books, and filtering books by author. Input validation and clear `400 Bad Request` and `404 Not Found` responses help clients use the API correctly.