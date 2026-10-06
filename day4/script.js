const noteText = document.getElementById("note-text");
const charCount = document.getElementById("char-count");
const wordCount = document.getElementById("word-count");
const clearBtn = document.getElementById("clear-btn");
const themeToggle = document.getElementById("theme-toggle");

function updateCounts() {
    const text = noteText.value;
    const characterCount = text.length;

    const words = text.trim() === ""
        ? []
        : text.trim().split(/\s+/);

    const numberOfWords = words.length;

    charCount.textContent = `${characterCount} / 200 characters`;
    wordCount.textContent = `${numberOfWords} words`;

    charCount.classList.remove("warning", "over");

    if (characterCount > 200) {
        charCount.classList.add("over");
    } else if (characterCount > 180) {
        charCount.classList.add("warning");
    }
}

function saveDraft() {
    localStorage.setItem("noteDraft", noteText.value);
}

function clearNote() {
    noteText.value = "";
    localStorage.removeItem("noteDraft");
    updateCounts();
}

noteText.addEventListener("input", () => {
    updateCounts();
    saveDraft();
});

clearBtn.addEventListener("click", clearNote);

noteText.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
        clearNote();
    }
});

themeToggle.addEventListener("click", () => {
    document.body.classList.toggle("dark");

    const isDark = document.body.classList.contains("dark");

    themeToggle.textContent = isDark ? "Light mode" : "Dark mode";

    localStorage.setItem("theme", isDark ? "dark" : "light");
});

const savedDraft = localStorage.getItem("noteDraft");

if (savedDraft !== null) {
    noteText.value = savedDraft;
}

const savedTheme = localStorage.getItem("theme");

if (savedTheme === "dark") {
    document.body.classList.add("dark");
    themeToggle.textContent = "Light mode";
} else {
    themeToggle.textContent = "Dark mode";
}

updateCounts();