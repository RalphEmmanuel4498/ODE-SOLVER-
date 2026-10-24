import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  getDoc,
  Unsubscribe,
} from 'firebase/firestore';
import { db, auth } from './config';
import { handleFirestoreError, OperationType } from './errors';
import { User } from 'firebase/auth';

export interface CustomModelDoc {
  id: string;
  userId: string;
  userEmail?: string;
  title: string;
  description?: string;
  equations: string[];
  compartments?: string[];
  parameters?: string[];
  defaultParams?: Record<string, number>;
  defaultInitialConditions?: Record<string, number>;
  derivationMethod?: string;
  derivationNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export async function syncUserProfile(user: User): Promise<void> {
  const path = `users/${user.uid}`;
  try {
    const userRef = doc(db, 'users', user.uid);
    const existingSnap = await getDoc(userRef);
    const now = new Date().toISOString();

    if (!existingSnap.exists()) {
      await setDoc(userRef, {
        userId: user.uid,
        email: user.email || '',
        displayName: user.displayName || 'Researcher',
        photoURL: user.photoURL || '',
        createdAt: now,
        updatedAt: now,
      });
    } else {
      await updateDoc(userRef, {
        displayName: user.displayName || 'Researcher',
        photoURL: user.photoURL || '',
        updatedAt: now,
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function createCustomModel(
  modelData: {
    title: string;
    description?: string;
    equations: string[];
    compartments?: string[];
    parameters?: string[];
    defaultParams?: Record<string, number>;
    defaultInitialConditions?: Record<string, number>;
    derivationMethod?: string;
    derivationNotes?: string;
  }
): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error('User must be signed in to save models.');

  const modelId = `model_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const path = `models/${modelId}`;
  const now = new Date().toISOString();

  const payload: CustomModelDoc = {
    id: modelId,
    userId: user.uid,
    userEmail: user.email || undefined,
    title: modelData.title.slice(0, 150),
    description: modelData.description ? modelData.description.slice(0, 1000) : '',
    equations: modelData.equations.slice(0, 20),
    compartments: modelData.compartments?.slice(0, 20) || [],
    parameters: modelData.parameters?.slice(0, 50) || [],
    defaultParams: modelData.defaultParams || {},
    defaultInitialConditions: modelData.defaultInitialConditions || {},
    derivationMethod: modelData.derivationMethod || 'HAM',
    derivationNotes: modelData.derivationNotes ? modelData.derivationNotes.slice(0, 5000) : '',
    createdAt: now,
    updatedAt: now,
  };

  try {
    await setDoc(doc(db, 'models', modelId), payload);
    return modelId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateCustomModel(
  modelId: string,
  modelData: Partial<CustomModelDoc>
): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('User must be signed in to update models.');

  const path = `models/${modelId}`;
  const updatePayload: Record<string, any> = {
    ...modelData,
    updatedAt: new Date().toISOString(),
  };
  delete updatePayload.userId;
  delete updatePayload.createdAt;

  try {
    await updateDoc(doc(db, 'models', modelId), updatePayload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteCustomModel(modelId: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('User must be signed in to delete models.');

  const path = `models/${modelId}`;
  try {
    await deleteDoc(doc(db, 'models', modelId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export function subscribeUserModels(
  userId: string,
  onUpdate: (models: CustomModelDoc[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const path = 'models';
  const q = query(collection(db, 'models'), where('userId', '==', userId));

  return onSnapshot(
    q,
    (snapshot) => {
      const models: CustomModelDoc[] = [];
      snapshot.forEach((docSnap) => {
        models.push(docSnap.data() as CustomModelDoc);
      });
      // Sort newest first
      models.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      onUpdate(models);
    },
    (error) => {
      if (onError) onError(error as Error);
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}
