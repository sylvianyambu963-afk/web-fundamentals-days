# School Database Design

## Students

The students table stores information about each student. It contains the student's ID, name and email address. The ID is the primary key, and the email is UNIQUE so that two students cannot use the same email address.

## Courses

The courses table stores the courses offered by the school. It contains a course ID and course name. The ID is the primary key.

## Enrolments

The enrolments table records which students are enrolled in which courses. It contains a student ID, course ID and grade. The student ID and course ID are foreign keys that connect the table to the students and courses tables.

## Relationships

There is a one-to-many relationship between students and enrolments because one student can have many enrolments, while each enrolment belongs to one student.

There is also a one-to-many relationship between courses and enrolments because one course can have many enrolments, while each enrolment belongs to one course.

Students and courses have a many-to-many relationship because one student can take many courses and one course can have many students. The enrolments table is needed as a join table to represent this many-to-many relationship. It stores each student-course combination and also allows us to store information about the enrolment, such as the student's grade.

The UNIQUE constraint on `(student_id, course_id)` prevents the same student from enrolling in the same course twice.

## Index

I would add an index on `enrolments.student_id` because the database will frequently search for all enrolments belonging to a particular student. An index would make these searches faster, especially when the school has many students and enrolments.

For example:

```sql
CREATE INDEX idx_enrolments_student_id
ON enrolments(student_id);