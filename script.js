const uploadModal = document.getElementById("upload-modal");
const uploadModalScrim = document.getElementById("upload-modal-scrim");

function openUploadModal() {
  if (uploadModal.open) return;
  uploadModalScrim.hidden = false;
  uploadModal.showModal();
}

function hideUploadModalScrim() {
  uploadModalScrim.hidden = true;
}

uploadModal.addEventListener("close", hideUploadModalScrim);

uploadModalScrim.addEventListener("click", () => {
  if (uploadModal.open) uploadModal.close();
});

const dropzone = document.getElementById("upload-dropzone");
const fileInput = document.getElementById("transcript-file");
const analysisPanel = document.getElementById("analysis-panel");
const analysisWordCount = document.getElementById("analysis-word-count");
const analysisStatus = document.getElementById("analysis-status");
const analysisTasksBlock = document.getElementById("analysis-tasks-block");
const analysisTaskList = document.getElementById("analysis-task-list");

const clientId = "362d872b-594c-81f3-b531-0037bb234034";
const redirectUri = "https://unfrozen-fragment-science.ngrok-free.dev/index.html";
const notionUrl =
`https://api.notion.com/v1/oauth/authorize?client_id=${clientId}&response_type=code&owner=user&redirect_uri=${redirectUri}`;

let numOfTasks = 0;

let CURRENT_TASKS = [];

const params = new URLSearchParams(window.location.search);

const code = params.get("code");

if (code) {
  console.log(code);
  window.history.replaceState({}, document.title, "/index.html");
  const notionButton = document.getElementById("analysis-notion-button");
  notionButton.remove();
  document.querySelector(".notion-status").hidden = false;
  fetch("https://your-backend.ngrok-free.app/notion/exchange", {
  method: "POST",
  headers: {
    "Content-Type": "application/json"
  },
  body: JSON.stringify({ code })
  })
  .then(res => res.json())
  .then(data => {
  console.log(data);
  document.querySelector(".notion-status").textContent = `Synced with Notion as ${data.owner.name}`;
  });
} else {
  document.querySelector(".analysis-panel__notion-button").addEventListener("click", handleNotionExport);
}

if (localStorage.getItem("savedData")) {
  const savedData = JSON.parse(localStorage.getItem("savedData"));
  CURRENT_TASKS = savedData.tasks;
  numOfTasks = savedData.tasks.length;
  renderAmountOfTasks(numOfTasks);
  showAnalysisCompleteUI(savedData.wordCount, savedData.fileName, savedData.tasks);
}

function countWords(text) {
  const t = text.trim();
  if (!t) return 0;
  return t.split(/\s+/).length;
}

function formatWordLine(wordCount, fileName) {
  const words = wordCount === 1 ? "1 word" : `${wordCount} words`;
  const name = typeof fileName === "string" ? fileName.trim() : "";
  if (name) return `${words} · ${name}`;
  return wordCount === 1 ? "1 word in transcript" : `${wordCount} words in transcript`;
}

function fillTaskList(tasks) {
  analysisTaskList.replaceChildren();
  for (const task of tasks) {
    const li = document.createElement("li");
    li.textContent = task;
    analysisTaskList.appendChild(li);
  }
}

function handleNotionExport() {
  if (CURRENT_TASKS.length === 0) {
    return;
  } else {
    window.location.href = notionUrl;
  }
}

function showAnalysisCompleteUI(wordCount, fileName, CURRENT_TASKS) {
  analysisPanel.hidden = false;
  analysisWordCount.textContent = formatWordLine(wordCount, fileName);
  analysisStatus.textContent = "Done";
  analysisStatus.classList.remove("analysis-panel__status-value--working");
  analysisStatus.classList.add("analysis-panel__status-value--done");
  if (CURRENT_TASKS.length > 0) {
    analysisTasksBlock.hidden = false;
    fillTaskList(CURRENT_TASKS);
    localStorage.setItem(
      "savedData",
      JSON.stringify({
        tasks: CURRENT_TASKS,
        wordCount,
        fileName
      })
    );
  } else {
    analysisTasksBlock.hidden = true;
    analysisTaskList.replaceChildren();
  }
}

function renderAmountOfTasks(num) {
  const label = document.querySelector(".analysis-panel__tasks-label");
  if (num === 0) {
    label.innerText = "Tasks";
  } else {
    label.innerText = `Tasks • ${num}`;
  }
}

function showAnalysisWorking(text, fileName) {
  numberOfTasks = 0;
  renderAmountOfTasks(numberOfTasks);
  const wordCount = countWords(text);
  analysisPanel.hidden = false;
  analysisWordCount.textContent = formatWordLine(wordCount, fileName);
  analysisStatus.textContent = "Working with Gemini...";
  analysisStatus.classList.remove("analysis-panel__status-value--done");
  analysisStatus.classList.add("analysis-panel__status-value--working");
  analysisTasksBlock.hidden = true;
  analysisTaskList.replaceChildren();
}

document.querySelector(".button-file").addEventListener("click", () => {
  openUploadModal();
});

document.querySelector(".upload-modal__close").addEventListener("click", () => {
  uploadModal.close();
  fileInput.value = "";
});

document.querySelector(".brand").addEventListener("click", () => {
  window.location.reload();
});

uploadModal.addEventListener("click", (e) => {
  if (e.target === uploadModal) {
    uploadModal.close();
    fileInput.value = "";
  }
});

document.querySelector(".upload-modal__browse").addEventListener("click", (e) => {
  e.stopPropagation();
  fileInput.click();
});

const url =
"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=AIzaSyBfMopBCgJbVjSsYVm9b6lifSRpFC52_wo";

async function getGeminiResponse(text, fileName) {
  CURRENT_TASKS = [];
  
  const payload = {
  contents: [
    {
      parts: [
        { text: `Extract all actionable tasks.

                    Return ONLY valid JSON.

                    Format:
                    {
                      "tasks": [
                        {
                          "assignee": "",
                          "task": "",
                          "due_date": ""
                        }
                      ]
                    }

                    Rules:
                    - Capitalize EVERYTHING correctly (names, places, etc.)
                    - No markdown
                    - No bullets
                    - No explanation text
                    - Use empty strings if missing information
                    - Always use natural language for due dates
                    - Keep tasks concise

                    Transcript:
                    ${text}` }
      ]
    }
  ]
  };
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    numOfTasks = 0;
    const data = await response.json();
    const geminiText = data.candidates[0].content.parts[0].text;
    const parsed = JSON.parse(geminiText);
    CURRENT_TASKS = parsed.tasks.map(task => {
    return `${task.assignee ? task.assignee + ": " : ""}${task.task}${task.due_date && task.due_date !== "Not specified" ? " due " + task.due_date : ""}`;
    });
    CURRENT_TASKS.forEach(element => {
      numOfTasks++;
    });
    renderAmountOfTasks(numOfTasks);
    showAnalysisCompleteUI(countWords(text), fileName, CURRENT_TASKS);
  } catch (error) {
    console.error("Error calling Gemini:", error);
  }
}

function readTranscriptFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    const text = typeof reader.result === "string" ? reader.result : "";
    uploadModal.close();
    fileInput.value = "";
    showAnalysisWorking(text, file.name || "Transcript");
    getGeminiResponse(text, file.name || "Transcript");
  };
  reader.onerror = () => {
    alert("Could not read that file. Try a plain text file (.txt, .md, .csv).");
  };
  reader.readAsText(file);
}

function handleFiles(files) {
  const file = files && files[0];
  if (!file) return;
  readTranscriptFile(file);
}

fileInput.addEventListener("change", () => {
  handleFiles(fileInput.files);
});

dropzone.addEventListener("click", (e) => {
  const browse = document.querySelector(".upload-modal__browse");
  if (e.target === browse || browse.contains(e.target)) return;
  fileInput.click();
});

dropzone.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    fileInput.click();
  }
});

dropzone.addEventListener("dragenter", (e) => {
  e.preventDefault();
  dropzone.classList.add("upload-modal__dropzone--active");
});

dropzone.addEventListener("dragleave", (e) => {
  e.preventDefault();
  if (!e.relatedTarget || !dropzone.contains(e.relatedTarget)) {
    dropzone.classList.remove("upload-modal__dropzone--active");
  }
});

dropzone.addEventListener("dragover", (e) => {
  e.preventDefault();
});

dropzone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropzone.classList.remove("upload-modal__dropzone--active");
  handleFiles(e.dataTransfer.files);
});