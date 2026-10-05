let notes = [
    { id: 1, text: "Buy milk and bread", category: "personal" },
    { id: 2, text: "Finish the Day 3 assignment", category: "study" },
    { id: 3, text: "Email the project report to Grace", category: "work" },
    { id: 4, text: "Revise JavaScript arrays", category: "study" },
    { id: 5, text: "Call mum", category: "personal" }
];

// Search notes
function searchNotes(word) {
    return notes.filter(note =>
        note.text.toLowerCase().includes(word.toLowerCase())
    );
}

console.log(searchNotes("JavaScript"));
// Expected: [{ id: 4, text: "Revise JavaScript arrays", category: "study" }]

console.log(searchNotes("Python"));
// Expected: []


// Find the longest note
function longestNote() {
    if (notes.length === 0) {
        return null;
    }

    let longest = notes[0];

    for (let note of notes) {
        if (note.text.length > longest.text.length) {
            longest = note;
        }
    }

    return longest;
}

console.log(longestNote());
// Expected: { id: 3, text: "Email the project report to Grace", category: "work" }

console.log(longestNote());
// Expected: the longest note object


// Count notes by category
function countByCategory() {
    let counts = {};

    for (let note of notes) {
        if (counts[note.category]) {
            counts[note.category]++;
        } else {
            counts[note.category] = 1;
        }
    }

    return counts;
}

console.log(countByCategory());
// Expected: { personal: 2, study: 2, work: 1 }

console.log(countByCategory());
// Expected: { personal: 2, study: 2, work: 1 }


// Get summary
function getSummary() {
    let counts = countByCategory();

    return `${notes.length} ${notes.length === 1 ? "note" : "notes"}: ${counts.personal || 0} personal, ${counts.work || 0} work, ${counts.study || 0} study.`;
}

console.log(getSummary());
// Expected: "5 notes: 2 personal, 1 work, 2 study."

console.log(getSummary());
// Expected: "5 notes: 2 personal, 1 work, 2 study."


// Check for duplicate
function isDuplicate(text) {
    return notes.some(note =>
        note.text.trim().toLowerCase() === text.trim().toLowerCase()
    );
}

console.log(isDuplicate("Buy milk and bread"));
// Expected: true

console.log(isDuplicate("Buy eggs"));
// Expected: false


// Add a note
function addNote(text, category) {
    if (text.trim().length < 1 || text.trim().length > 200) {
        console.log("Note not added: text must be 1–200 characters.");
        return false;
    }

    if (isDuplicate(text)) {
        console.log("Note not added: duplicate note.");
        return false;
    }

    if (!["personal", "work", "study"].includes(category)) {
        console.log("Note not added: invalid category.");
        return false;
    }

    notes.push({
        id: notes.length + 1,
        text: text.trim(),
        category: category
    });

    return true;
}

console.log(addNote("Practice JavaScript", "study"));
// Expected: true

console.log(addNote("Buy milk and bread", "personal"));
// Expected: false