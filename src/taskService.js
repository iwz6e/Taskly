import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "./firebase";


export function subscribeToUserTasks(userId, onSuccess, onError) {
  const userTasksRef = collection(db, "users", userId, "tasks");
  const orderedQuery = query(userTasksRef, orderBy("createdAt", "desc"));

  return onSnapshot(
    orderedQuery,
    (snapshot) => {
      const items = snapshot.docs.map((item) => ({
        id: item.id,
        ...item.data(),
      }));
      onSuccess(items);
    },
    (error) => {
      if (onError) onError(error);
    }
  );
}


export async function addUserTask(userId, { title, priority, dueDate }) {
  const userTasksRef = collection(db, "users", userId, "tasks");
  return addDoc(userTasksRef, {
    title: title.trim(),
    completed: false,
    priority,
    dueDate,
    createdAt: serverTimestamp(),
  });
}


export async function toggleUserTaskStatus(userId, taskId, currentStatus) {
  const taskDocRef = doc(db, "users", userId, "tasks", taskId);
  return updateDoc(taskDocRef, {
    completed: !currentStatus,
  });
}


export async function updateUserTask(userId, taskId, updatedFields) {
  const taskDocRef = doc(db, "users", userId, "tasks", taskId);
  return updateDoc(taskDocRef, updatedFields);
}


export async function deleteUserTask(userId, taskId) {
  const taskDocRef = doc(db, "users", userId, "tasks", taskId);
  return deleteDoc(taskDocRef);
}