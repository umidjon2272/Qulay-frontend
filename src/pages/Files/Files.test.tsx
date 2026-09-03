import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Files from './Files';
import * as api from '../../services/api/fileApi';
import type { ApiFile, ApiFolder } from '../../services/api/types';

vi.mock('../../features/ai/hooks/useAIChat', () => ({ useAIChat: () => ({ open: vi.fn() }) }));
vi.mock('../../hooks/useToast', () => ({ useToast: () => ({ showToast: toast }) }));
const toast = vi.fn();
vi.mock('../../services/api/fileApi', () => ({ listFiles: vi.fn(), listFolders: vi.fn(), createFolder: vi.fn(), updateFolder: vi.fn(), deleteFolder: vi.fn(), deleteFile: vi.fn(), updateFile: vi.fn(), downloadFile: vi.fn(), getFileContent: vi.fn(), uploadFileWithProgress: vi.fn() }));
const file = { id: 'file-a', originalName: 'report.pdf', label: null, mimeType: 'application/pdf', extension: 'pdf', sizeBytes: 1234, source: 'UPLOAD', folderId: null, createdAt: '2026-09-01T00:00:00Z' } as ApiFile;
let folders: ApiFolder[];
beforeEach(() => {
  localStorage.clear(); vi.clearAllMocks(); folders = [];
  vi.mocked(api.listFiles).mockResolvedValue({ items: [file], meta: { page: 1, limit: 50, total: 1, totalPages: 1 } });
  vi.mocked(api.listFolders).mockImplementation(async () => [...folders]);
  vi.mocked(api.createFolder).mockImplementation(async name => {
    const folder = { id: 'folder-a', name, parentId: null, _count: { files: 0, children: 0 } } as ApiFolder;
    folders.push(folder); return folder;
  });
});
describe('file menu and folder rendering', () => {
  it('keeps the three-dot menu open and exposes all file actions', async () => {
    render(<Files />);
    fireEvent.click(await screen.findByRole('button', { name: 'Fayl amallarini ochish' }));
    expect(screen.getByRole('button', { name: 'Ochish' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Yuklab olish' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Nomini o‘zgartirish' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Papkaga ko‘chirish' })).toBeVisible();
    expect(screen.getByRole('button', { name: "O'chirish" })).toBeVisible();
  });
  it('renders an empty newly-created root folder and retains it on remount', async () => {
    const view = render(<Files />);
    await screen.findByText('report.pdf');
    fireEvent.click(screen.getByRole('button', { name: 'Papka yaratish' }));
    fireEvent.change(screen.getByLabelText('Papka nomi'), { target: { value: 'Shartnomalar' } });
    fireEvent.click(screen.getByRole('button', { name: 'Yaratish' }));
    await waitFor(() => expect(api.createFolder).toHaveBeenCalledWith('Shartnomalar', undefined));
    expect(await screen.findByRole('button', { name: /Shartnomalar/ })).toHaveTextContent('0 fayl');
    view.unmount(); render(<Files />);
    expect(await screen.findByRole('button', { name: /Shartnomalar/ })).toBeVisible();
  });
  it('renames through the backend contract instead of a fake success toast', async () => {
    vi.mocked(api.updateFile).mockResolvedValue({ ...file, originalName: 'budget.pdf' });
    render(<Files />);
    fireEvent.click(await screen.findByRole('button', { name: 'Fayl amallarini ochish' }));
    fireEvent.click(screen.getByRole('button', { name: 'Nomini o‘zgartirish' }));
    const dialog = screen.getByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Fayl nomi'), { target: { value: 'budget.pdf' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Saqlash' }));
    await waitFor(() => expect(api.updateFile).toHaveBeenCalledWith('file-a', { originalName: 'budget.pdf' }));
  });
});
