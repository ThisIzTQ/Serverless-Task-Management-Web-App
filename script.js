const API_URL = "https://p3j1eu0y4h.execute-api.ap-south-1.amazonaws.com/tasks";
const taskForm = document.getElementById("task-form");
const titleInput = document.getElementById("task-title");
const priorityInput = document.getElementById("task-priority");
const dueDateInput = document.getElementById("task-due-date");
const submitButton = document.getElementById("submit-task");
const cancelEditButton = document.getElementById("cancel-edit");
const list = document.getElementById("list");
const emptyState = document.getElementById("empty-state");
const taskCount = document.getElementById("task-count");
const completedCount = document.getElementById("completed-count");
const filterButtons = document.querySelectorAll(".filter");

let tasks = [];
let activeFilter = "all";
let editingTaskId = null;

async function request(path = "", options = {}) {
    const response = await fetch(`${API_URL}${path}`, {
        headers: { "Content-Type": "application/json" },
        ...options,
    });

    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.message || "The task request failed.");
    }

    return data;
}

function showError(message) {
    emptyState.hidden = false;
    emptyState.textContent = message;
}

async function loadTasks() {
    emptyState.hidden = false;
    emptyState.textContent = "Loading tasks...";

    try {
        tasks = await request();
        renderTasks();
    } catch (error) {
        console.error(error);
        showError("Unable to load tasks. Please refresh and try again.");
    }
}

function formatDueDate(date) {
    if (!date) return "No due date";
    return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(`${date}T00:00:00`));
}

function visibleTasks() {
    if (activeFilter === "active") return tasks.filter((task) => !task.completed);
    if (activeFilter === "completed") return tasks.filter((task) => task.completed);
    return tasks;
}

function actionButton(label, className, handler) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = className;
    button.textContent = label;
    button.addEventListener("click", handler);
    return button;
}

function renderTasks() {
    list.replaceChildren();
    const filteredTasks = visibleTasks();
    filteredTasks.forEach((task) => {
        const item = document.createElement("li");
        item.className = `task-item${task.completed ? " checked" : ""}`;
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = task.completed;
        checkbox.setAttribute("aria-label", `Mark ${task.title} as ${task.completed ? "active" : "completed"}`);
        checkbox.addEventListener("change", () => toggleTask(task.id));

        const details = document.createElement("div");
        details.className = "task-details";
        const title = document.createElement("strong");
        title.textContent = task.title;
        const meta = document.createElement("span");
        meta.className = "task-meta";
        meta.textContent = `${task.priority} priority • ${formatDueDate(task.dueDate)}`;
        details.append(title, meta);

        const actions = document.createElement("div");
        actions.className = "task-actions";
        actions.append(actionButton("Edit", "edit-task", () => startEditing(task.id)), actionButton("Delete", "delete-task", () => deleteTask(task.id)));
        item.append(checkbox, details, actions);
        list.append(item);
    });

    const completed = tasks.filter((task) => task.completed).length;
    taskCount.textContent = `${tasks.length} ${tasks.length === 1 ? "task" : "tasks"}`;
    completedCount.textContent = `${completed} completed`;
    emptyState.hidden = filteredTasks.length > 0;
}

async function toggleTask(id) {
    const task = tasks.find((item) => item.id === id);
    if (!task) return;

    try {
        const updatedTask = await request(`/${id}`, {
            method: "PUT",
            body: JSON.stringify({ ...task, completed: !task.completed }),
        });
        tasks = tasks.map((item) => item.id === id ? updatedTask : item);
        renderTasks();
    } catch (error) {
        console.error(error);
        showError("Unable to update the task. Please try again.");
    }
}

async function deleteTask(id) {
    try {
        await request(`/${id}`, { method: "DELETE" });
        tasks = tasks.filter((task) => task.id !== id);
        if (editingTaskId === id) resetForm();
        renderTasks();
    } catch (error) {
        console.error(error);
        showError("Unable to delete the task. Please try again.");
    }
}

function startEditing(id) {
    const task = tasks.find((item) => item.id === id);
    if (!task) return;
    editingTaskId = id;
    titleInput.value = task.title;
    priorityInput.value = task.priority;
    dueDateInput.value = task.dueDate || "";
    submitButton.textContent = "Save changes";
    cancelEditButton.hidden = false;
    titleInput.focus();
}

function resetForm() {
    editingTaskId = null;
    taskForm.reset();
    priorityInput.value = "medium";
    submitButton.textContent = "Add task";
    cancelEditButton.hidden = true;
}

taskForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const title = titleInput.value.trim();
    if (!title) return;
    const taskData = { title, priority: priorityInput.value, dueDate: dueDateInput.value };
    try {
        if (editingTaskId) {
            const updatedTask = await request(`/${editingTaskId}`, {
                method: "PUT",
                body: JSON.stringify({ ...taskData, completed: tasks.find((task) => task.id === editingTaskId).completed }),
            });
            tasks = tasks.map((task) => task.id === editingTaskId ? updatedTask : task);
        } else {
            const newTask = await request("", {
                method: "POST",
                body: JSON.stringify(taskData),
            });
            tasks.unshift(newTask);
        }
        resetForm();
        renderTasks();
    } catch (error) {
        console.error(error);
        showError("Unable to save the task. Please try again.");
    }
});

cancelEditButton.addEventListener("click", resetForm);
filterButtons.forEach((button) => button.addEventListener("click", () => {
    activeFilter = button.dataset.filter;
    filterButtons.forEach((item) => item.classList.toggle("active", item === button));
    renderTasks();
}));

loadTasks();
