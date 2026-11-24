import { useEffect, useState } from "react";
import "./App.css";

import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";

import { auth } from "./firebase";
import {
  addUserTask,
  deleteUserTask,
  subscribeToUserTasks,
  toggleUserTaskStatus,
  updateUserTask,
} from "./taskService";

function App() {
  const [user, setUser] = useState(null);
  const [checkingUser, setCheckingUser] = useState(true);

  const [formMode, setFormMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [tasks, setTasks] = useState([]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [taskMessage, setTaskMessage] = useState("");

  const [taskTitle, setTaskTitle] = useState("");
  const [taskPriority, setTaskPriority] = useState("Medium");
  const [taskDate, setTaskDate] = useState("");

  // حالات تعديل المهمة (العنوان + الأولوية + التاريخ)
  const [activeEditId, setActiveEditId] = useState(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftPriority, setDraftPriority] = useState("Medium");
  const [draftDate, setDraftDate] = useState("");

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All");
  const [priority, setPriority] = useState("All");

  // الاستماع لحالة تسجيل الدخول
  useEffect(() => {
    const stopListening = onAuthStateChanged(auth, (account) => {
      setUser(account);
      setCheckingUser(false);
    });

    return () => stopListening();
  }, []);

  // الاستماع اللحظي للمهام عبر taskService
  useEffect(() => {
    if (!user) {
      setTasks([]);
      setLoadingTasks(false);
      return undefined;
    }

    setLoadingTasks(true);
    setTaskMessage("");

    const stopListening = subscribeToUserTasks(
      user.uid,
      (items) => {
        setTasks(items);
        setLoadingTasks(false);
      },
      (error) => {
        console.error("Unable to load tasks:", error);
        setTaskMessage("Tasks could not be loaded. Please try again.");
        setLoadingTasks(false);
      }
    );

    return () => stopListening();
  }, [user]);

  async function submitAuth(event) {
    event.preventDefault();
    setAuthMessage("");

    if (password.length < 6) {
      setAuthMessage("Password must be at least 6 characters.");
      return;
    }

    try {
      setIsSubmitting(true);

      if (formMode === "signup") {
        await createUserWithEmailAndPassword(auth, email.trim(), password);
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      }
    } catch (error) {
      const errorText = {
        "auth/email-already-in-use": "This email is already registered.",
        "auth/invalid-email": "Please enter a valid email address.",
        "auth/invalid-credential": "Incorrect email or password.",
        "auth/user-not-found": "No account found with this email.",
        "auth/wrong-password": "Incorrect password.",
        "auth/weak-password": "Password must be at least 6 characters.",
        "auth/too-many-requests": "Too many attempts. Please try again later.",
      };

      setAuthMessage(
        errorText[error.code] || "Something went wrong. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function logout() {
    try {
      await signOut(auth);
      setSearch("");
      setStatus("All");
      setPriority("All");
      setActiveEditId(null);
      setDraftTitle("");
    } catch (error) {
      console.error("Unable to log out:", error);
    }
  }

  async function createTask(event) {
    event.preventDefault();
    if (!taskTitle.trim()) return;

    setTaskMessage("");

    try {
      await addUserTask(user.uid, {
        title: taskTitle,
        priority: taskPriority,
        dueDate: taskDate,
      });

      setTaskTitle("");
      setTaskPriority("Medium");
      setTaskDate("");
    } catch (error) {
      console.error("Unable to create task:", error);
      setTaskMessage("The task could not be added. Please try again.");
    }
  }

  async function changeTaskStatus(task) {
    setTaskMessage("");

    try {
      await toggleUserTaskStatus(user.uid, task.id, task.completed);
    } catch (error) {
      console.error("Unable to update task:", error);
      setTaskMessage("The task could not be updated.");
    }
  }

  async function removeTask(taskId) {
    setTaskMessage("");

    try {
      await deleteUserTask(user.uid, taskId);

      if (activeEditId === taskId) {
        setActiveEditId(null);
        setDraftTitle("");
      }
    } catch (error) {
      console.error("Unable to delete task:", error);
      setTaskMessage("The task could not be deleted.");
    }
  }

  function editTask(task) {
    setActiveEditId(task.id);
    setDraftTitle(task.title);
    setDraftPriority(task.priority || "Medium");
    setDraftDate(task.dueDate || "");
  }

  async function saveEditedTask(taskId) {
    if (!draftTitle.trim()) return;

    setTaskMessage("");

    try {
      await updateUserTask(user.uid, taskId, {
        title: draftTitle.trim(),
        priority: draftPriority,
        dueDate: draftDate,
      });

      setActiveEditId(null);
      setDraftTitle("");
    } catch (error) {
      console.error("Unable to save task:", error);
      setTaskMessage("Changes could not be saved.");
    }
  }

  const finishedTasks = tasks.filter((task) => task.completed).length;

  const visibleTasks = tasks.filter((task) => {
    const titleMatches = task.title
      .toLowerCase()
      .includes(search.toLowerCase());

    const statusMatches =
      status === "All" ||
      (status === "Active" && !task.completed) ||
      (status === "Completed" && task.completed);

    const priorityMatches =
      priority === "All" || task.priority === priority;

    return titleMatches && statusMatches && priorityMatches;
  });

  if (checkingUser) {
    return (
      <div className="auth-loading">
        <div className="loading-mark">T</div>
        <h2>Taskly</h2>
        <p>Getting things ready...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="auth-page">
        <section className="auth-card">
          <div className="brand-lockup">
            <span className="brand-symbol">T</span>
            <span className="auth-logo">Taskly</span>
          </div>

          <p className="eyebrow">YOUR DAY, IN ORDER</p>
          <h2>
            {formMode === "login" ? "Welcome back" : "Create your account"}
          </h2>
          <p className="auth-subtitle">
            {formMode === "login"
              ? "Sign in to see what you need to get done."
              : "Create an account and start organizing your tasks."}
          </p>

          <form className="auth-form" onSubmit={submitAuth}>
            <label htmlFor="email">Email address</label>
            <input
              id="email"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />

            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              placeholder="At least 6 characters"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={6}
              required
            />

            {authMessage && <p className="auth-error">{authMessage}</p>}

            <button className="auth-submit" type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? "Please wait..."
                : formMode === "login"
                  ? "Sign in"
                  : "Create account"}
            </button>
          </form>

          <p className="auth-switch">
            {formMode === "login"
              ? "New to Taskly?"
              : "Already have an account?"}
            <button
              type="button"
              onClick={() => {
                setFormMode(formMode === "login" ? "signup" : "login");
                setAuthMessage("");
              }}
            >
              {formMode === "login" ? "Create account" : "Sign in"}
            </button>
          </p>
        </section>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="header">
        <a className="brand-lockup" href="#top" aria-label="Taskly home">
          <span className="brand-symbol">T</span>
          <span className="brand-name">Taskly</span>
        </a>

        <div className="header-user">
          <div className="user-info">
            <span className="user-label">SIGNED IN AS</span>
            <span className="user-email">{user.email}</span>
          </div>
          <div className="profile">
            {user.email?.charAt(0).toUpperCase()}
          </div>
          <button type="button" className="logout-button" onClick={logout}>
            Log out
          </button>
        </div>
      </header>

      <main id="top">
        <section className="welcome">
          <div>
            <p className="eyebrow">PERSONAL WORKSPACE</p>
            <h1>Make room for what matters.</h1>
            <p className="welcome-copy">
              Keep your tasks clear and your day moving forward.
            </p>
          </div>
          <div className="welcome-decoration" aria-hidden="true">
            <span>✓</span>
          </div>
        </section>

        <section className="stats" aria-label="Task summary">
          <article className="stat-card">
            <span className="stat-icon">▤</span>
            <div>
              <p>Total tasks</p>
              <h2>{tasks.length}</h2>
            </div>
          </article>
          <article className="stat-card completed-stat">
            <span className="stat-icon">✓</span>
            <div>
              <p>Completed</p>
              <h2>{finishedTasks}</h2>
            </div>
          </article>
        </section>

        <section className="tasks">
          <div className="section-heading">
            <div>
              <p className="eyebrow">STAY ON TRACK</p>
              <h2>My tasks</h2>
            </div>
            <span className="task-count">{visibleTasks.length} shown</span>
          </div>

          <form className="task-form" onSubmit={createTask}>
            <div className="field task-title-field">
              <label htmlFor="new-task">Task name</label>
              <input
                id="new-task"
                type="text"
                placeholder="What do you need to do?"
                value={taskTitle}
                onChange={(event) => setTaskTitle(event.target.value)}
              />
            </div>

            <div className="field">
              <label htmlFor="task-priority">Priority</label>
              <select
                id="task-priority"
                value={taskPriority}
                onChange={(event) => setTaskPriority(event.target.value)}
              >
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>

            <div className="field">
              <label htmlFor="task-date">Due date</label>
              <input
                id="task-date"
                type="date"
                value={taskDate}
                onChange={(event) => setTaskDate(event.target.value)}
              />
            </div>

            <button className="add-button" type="submit">
              <span>+</span> Add task
            </button>
          </form>

          {taskMessage && <p className="auth-error">{taskMessage}</p>}

          <div className="filters">
            <input
              className="search-input"
              type="text"
              placeholder="Search your tasks..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              aria-label="Search tasks"
            />

            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              aria-label="Filter by status"
            >
              <option value="All">All statuses</option>
              <option value="Active">Active</option>
              <option value="Completed">Completed</option>
            </select>

            <select
              value={priority}
              onChange={(event) => setPriority(event.target.value)}
              aria-label="Filter by priority"
            >
              <option value="All">All priorities</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>

          <div className="task-list">
            {loadingTasks ? (
              <div className="empty-state">
                <h3>Loading your tasks...</h3>
              </div>
            ) : visibleTasks.length === 0 ? (
              <div className="empty-state">
                <span className="empty-icon">✦</span>
                <h3>No tasks to show</h3>
                <p>Try another search or add a new task above.</p>
              </div>
            ) : (
              visibleTasks.map((task) => (
                <article className="task-card" key={task.id}>
                  <div className="task-content">
                    <input
                      type="checkbox"
                      checked={task.completed}
                      onChange={() => changeTaskStatus(task)}
                      aria-label={`Mark ${task.title} as completed`}
                    />

                    <div className="task-details">
                      {activeEditId === task.id ? (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "8px" }}>
                          <input
                            className="edit-input"
                            type="text"
                            value={draftTitle}
                            onChange={(event) => setDraftTitle(event.target.value)}
                            aria-label="Edit task title"
                          />
                          <select
                            className="edit-input"
                            style={{ maxWidth: "120px" }}
                            value={draftPriority}
                            onChange={(event) => setDraftPriority(event.target.value)}
                            aria-label="Edit task priority"
                          >
                            <option value="High">High</option>
                            <option value="Medium">Medium</option>
                            <option value="Low">Low</option>
                          </select>
                          <input
                            className="edit-input"
                            style={{ maxWidth: "150px" }}
                            type="date"
                            value={draftDate}
                            onChange={(event) => setDraftDate(event.target.value)}
                            aria-label="Edit task due date"
                          />
                        </div>
                      ) : (
                        <h3 className={task.completed ? "completed" : ""}>
                          {task.title}
                        </h3>
                      )}

                      <div className="task-meta">
                        <span className={`priority ${task.priority.toLowerCase()}`}>
                          {task.priority} priority
                        </span>
                        {task.dueDate && (
                          <span className="due-date">Due {task.dueDate}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="task-actions">
                    <button
                      type="button"
                      className="edit-button"
                      onClick={() =>
                        activeEditId === task.id
                          ? saveEditedTask(task.id)
                          : editTask(task)
                      }
                    >
                      {activeEditId === task.id ? "Save" : "Edit"}
                    </button>
                    <button
                      type="button"
                      className="delete-button"
                      onClick={() => removeTask(task.id)}
                    >
                      Delete
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;