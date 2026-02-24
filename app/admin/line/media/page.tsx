"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface MediaFolder {
  id: number;
  name: string;
  sort_order: number;
  file_count: number;
}

interface MediaFile {
  id: number;
  name: string;
  file_url: string;
  file_type: "image" | "menu_image" | "pdf";
  mime_type: string;
  file_size: number;
  folder_id: number | null;
  created_at: string;
  updated_at: string;
}

type FileTypeFilter = "image" | "menu_image" | "pdf";

const FILE_TYPE_LABELS: Record<FileTypeFilter, string> = {
  image: "画像",
  menu_image: "メニュー画像",
  pdf: "PDF",
};

const FILE_TYPE_SPECS: Record<FileTypeFilter, { maxSize: string; formats: string }> = {
  image: { maxSize: "10MB", formats: "jpg,png,gif画像のみ可" },
  menu_image: { maxSize: "1MB", formats: "jpg,png画像、サイズは2500×1686pxまたは2500×843pxのみ可" },
  pdf: { maxSize: "10MB", formats: "PDFファイルのみ" },
};

const FILE_TYPE_ACCEPT: Record<FileTypeFilter, string> = {
  image: "image/jpeg,image/png,image/gif,image/webp",
  menu_image: "image/jpeg,image/png",
  pdf: "application/pdf",
};

export default function MediaManagementPage() {
  const [folders, setFolders] = useState<MediaFolder[]>([]);
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(null);
  const [typeFilters, setTypeFilters] = useState<Set<FileTypeFilter>>(new Set(["image", "menu_image", "pdf"]));
  const [searchQuery, setSearchQuery] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadFileType, setUploadFileType] = useState<FileTypeFilter>("image");
  const [dragOver, setDragOver] = useState(false);

  // モーダル
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [editingFolder, setEditingFolder] = useState<MediaFolder | null>(null);
  const [folderName, setFolderName] = useState("");
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renamingFile, setRenamingFile] = useState<MediaFile | null>(null);
  const [newFileName, setNewFileName] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<MediaFile | null>(null);
  const [deleteFolderConfirm, setDeleteFolderConfirm] = useState<MediaFolder | null>(null);
  const [showUploadTypeModal, setShowUploadTypeModal] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [compressConfirm, setCompressConfirm] = useState<{ files: File[]; smallFiles: File[] } | null>(null);
  const [previewFile, setPreviewFile] = useState<MediaFile | null>(null);
  const [moveFile, setMoveFile] = useState<MediaFile | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);

  const fetchFolders = useCallback(async () => {
    const res = await fetch("/api/admin/line/media-folders", { credentials: "include" });
    const data = await res.json();
    if (data.folders) setFolders(data.folders);
  }, []);

  const fetchFiles = useCallback(async () => {
    const params = new URLSearchParams();
    if (selectedFolderId !== null) params.set("folder_id", String(selectedFolderId));
    if (searchQuery) params.set("search", searchQuery);

    const res = await fetch(`/api/admin/line/media?${params}`, { credentials: "include" });
    const data = await res.json();
    if (data.files) setFiles(data.files);
  }, [selectedFolderId, searchQuery]);

  useEffect(() => {
    Promise.all([fetchFolders(), fetchFiles()]).then(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!loading) fetchFiles();
  }, [selectedFolderId, searchQuery]);

  const filteredFiles = files.filter((f) => typeFilters.has(f.file_type));

  const toggleFilter = (type: FileTypeFilter) => {
    setTypeFilters((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        if (next.size > 1) next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 0) {
      setPendingFiles(droppedFiles);
      setShowUploadTypeModal(true);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length > 0) {
      setPendingFiles(selectedFiles);
      setShowUploadTypeModal(true);
    }
    e.target.value = "";
  };

  const handleUpload = async (fileType: FileTypeFilter) => {
    setShowUploadTypeModal(false);

    const MAX_MENU_SIZE = 1 * 1024 * 1024;

    // メニュー画像で1MB超のファイルがあれば圧縮確認ダイアログを表示
    if (fileType === "menu_image") {
      const overSize = pendingFiles.filter((f) => f.size > MAX_MENU_SIZE);
      const underSize = pendingFiles.filter((f) => f.size <= MAX_MENU_SIZE);
      if (overSize.length > 0) {
        setCompressConfirm({ files: overSize, smallFiles: underSize });
        return;
      }
    }

    await doUpload(pendingFiles, fileType);
  };

  // 実際のアップロード処理
  const doUpload = async (filesToUpload: File[], fileType: FileTypeFilter) => {
    setUploading(true);

    for (const file of filesToUpload) {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("file_type", fileType);
      if (selectedFolderId !== null) formData.append("folder_id", String(selectedFolderId));

      const res = await fetch("/api/admin/line/media", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        alert(`${file.name}: ${data.error || "アップロード失敗"}`);
      }
    }

    setPendingFiles([]);
    setUploading(false);
    await Promise.all([fetchFolders(), fetchFiles()]);
  };

  // 圧縮確認ダイアログで「圧縮してアップロード」を選択した場合
  const handleCompressAndUpload = async () => {
    if (!compressConfirm) return;
    setCompressConfirm(null);
    setUploading(true);

    try {
      const compressed: File[] = [];
      for (const file of compressConfirm.files) {
        compressed.push(await compressImage(file));
      }
      await doUpload([...compressConfirm.smallFiles, ...compressed], "menu_image");
    } catch (e) {
      alert(e instanceof Error ? e.message : "圧縮に失敗しました");
      setUploading(false);
    }
  };

  const handleRename = async () => {
    if (!renamingFile || !newFileName.trim() || saving) return;
    setSaving(true);

    const res = await fetch("/api/admin/line/media", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ id: renamingFile.id, name: newFileName.trim() }),
    });

    if (res.ok) {
      await fetchFiles();
      setShowRenameModal(false);
      setRenamingFile(null);
    } else {
      const data = await res.json();
      alert(data.error || "変更失敗");
    }
    setSaving(false);
  };

  const handleMoveToFolder = async (folderId: number) => {
    if (!moveFile) return;

    const res = await fetch("/api/admin/line/media", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ id: moveFile.id, folder_id: folderId }),
    });

    if (res.ok) {
      await Promise.all([fetchFolders(), fetchFiles()]);
    }
    setMoveFile(null);
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;

    const res = await fetch(`/api/admin/line/media?id=${deleteConfirm.id}`, {
      method: "DELETE",
      credentials: "include",
    });

    if (res.ok) {
      await Promise.all([fetchFolders(), fetchFiles()]);
    }
    setDeleteConfirm(null);
  };

  const handleCreateFolder = async () => {
    if (!folderName.trim() || saving) return;
    setSaving(true);

    const url = "/api/admin/line/media-folders";
    const method = editingFolder ? "PUT" : "POST";
    const body = editingFolder
      ? { id: editingFolder.id, name: folderName.trim() }
      : { name: folderName.trim() };

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body),
    });

    if (res.ok) {
      await fetchFolders();
      setShowFolderModal(false);
      setFolderName("");
      setEditingFolder(null);
    } else {
      const data = await res.json();
      alert(data.error || "保存失敗");
    }
    setSaving(false);
  };

  const handleDeleteFolder = async () => {
    if (!deleteFolderConfirm) return;

    const res = await fetch(`/api/admin/line/media-folders?id=${deleteFolderConfirm.id}`, {
      method: "DELETE",
      credentials: "include",
    });

    if (res.ok) {
      if (selectedFolderId === deleteFolderConfirm.id) setSelectedFolderId(null);
      await Promise.all([fetchFolders(), fetchFiles()]);
    } else {
      const data = await res.json();
      alert(data.error || "削除失敗");
    }
    setDeleteFolderConfirm(null);
  };

  // メニュー画像を1MB以下に圧縮（Canvas API）
  const compressImage = async (file: File): Promise<File> => {
    const MAX_SIZE = 1 * 1024 * 1024;
    const img = new Image();
    const url = URL.createObjectURL(file);

    return new Promise((resolve, reject) => {
      img.onload = () => {
        URL.revokeObjectURL(url);

        const tryWithScale = (dimScale: number) => {
          const canvas = document.createElement("canvas");
          const maxW = 2500 * dimScale;
          const scale = img.width > maxW ? maxW / img.width : dimScale;
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);
          const ctx = canvas.getContext("2d")!;
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          const tryQuality = (quality: number) => {
            canvas.toBlob(
              (blob) => {
                if (!blob) return reject(new Error("圧縮に失敗しました"));
                if (blob.size <= MAX_SIZE) {
                  const name = file.name.replace(/\.[^.]+$/, ".jpg");
                  resolve(new File([blob], name, { type: "image/jpeg" }));
                } else if (quality > 0.15) {
                  tryQuality(quality - 0.05);
                } else if (dimScale > 0.5) {
                  // 品質を下げても1MB超 → 寸法を縮小して再試行
                  tryWithScale(dimScale - 0.25);
                } else {
                  reject(new Error("圧縮しても1MB以下にできませんでした"));
                }
              },
              "image/jpeg",
              quality,
            );
          };
          tryQuality(0.85);
        };
        tryWithScale(1.0);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("画像の読み込みに失敗しました"));
      };
      img.src = url;
    });
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  const formatDate = (d: string) => {
    const date = new Date(d);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
    const w = weekdays[date.getDay()];
    return `${y}/${m}/${day}(${w})`;
  };

  const getFileTypeIcon = (file: MediaFile) => {
    if (file.file_type === "pdf") {
      return (
        <div className="w-full h-full bg-red-50 flex items-center justify-center">
          <svg className="w-10 h-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          <span className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] font-bold text-red-500 bg-red-50 px-1">PDF</span>
        </div>
      );
    }
    return (
      <img
        src={file.file_url}
        alt={file.name}
        className="w-full h-full object-cover"
        loading="lazy"
      />
    );
  };

  const getFileTypeBadge = (type: string) => {
    switch (type) {
      case "image": return { label: "画像", bg: "bg-blue-100", text: "text-blue-600" };
      case "menu_image": return { label: "メニュー", bg: "bg-purple-100", text: "text-purple-600" };
      case "pdf": return { label: "PDF", bg: "bg-red-100", text: "text-red-600" };
      default: return { label: type, bg: "bg-gray-100", text: "text-gray-600" };
    }
  };

  return (
    <div className="min-h-full bg-gray-50/50">
      {/* ヘッダー */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                登録メディア一覧
              </h1>
              <p className="text-sm text-gray-400 mt-1">登録した画像や動画などの一覧を管理することができます</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setEditingFolder(null); setFolderName(""); setShowFolderModal(true); }}
                className="px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                新しいフォルダ
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-6">
        <div className="flex gap-6">
          {/* 左サイドバー - フォルダ */}
          <div className="w-56 flex-shrink-0">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {/* すべて */}
              <button
                onClick={() => setSelectedFolderId(null)}
                className={`w-full px-4 py-3 text-left text-sm flex items-center justify-between transition-colors ${
                  selectedFolderId === null ? "bg-green-50 text-[#06C755] font-medium border-l-3 border-[#06C755]" : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  すべて
                </span>
                <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                  {files.length}
                </span>
              </button>

              {folders.map((folder, idx) => (
                <div
                  key={folder.id}
                  className={`group border-t border-gray-50 ${
                    selectedFolderId === folder.id ? "bg-green-50 border-l-3 border-[#06C755]" : ""
                  }`}
                >
                  <button
                    onClick={() => setSelectedFolderId(folder.id)}
                    className={`w-full px-4 py-3 text-left text-sm flex items-center justify-between transition-colors ${
                      selectedFolderId === folder.id ? "text-[#06C755] font-medium" : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                      </svg>
                      <span className="truncate">{folder.name}</span>
                    </span>
                    <span className="flex items-center gap-1 flex-shrink-0">
                      <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{folder.file_count}</span>
                      {folder.name !== "未分類" && (
                        <span className="hidden group-hover:flex items-center gap-0.5">
                          <button
                            onClick={(e) => { e.stopPropagation(); setEditingFolder(folder); setFolderName(folder.name); setShowFolderModal(true); }}
                            className="p-0.5 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setDeleteFolderConfirm(folder); }}
                            className="p-0.5 rounded hover:bg-red-100 text-gray-400 hover:text-red-500"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </span>
                      )}
                    </span>
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* 右メインエリア */}
          <div className="flex-1 min-w-0">
            {/* アップロードエリア + スペック */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
              <div className="flex gap-6">
                {/* ドラッグ&ドロップ */}
                <div
                  className={`flex-1 border-2 border-dashed rounded-xl py-10 flex flex-col items-center justify-center transition-colors cursor-pointer ${
                    dragOver
                      ? "border-green-400 bg-green-50/50"
                      : "border-gray-200 hover:border-green-300 hover:bg-green-50/20"
                  }`}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleFileDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {uploading ? (
                    <>
                      <div className="w-8 h-8 border-2 border-green-200 border-t-green-500 rounded-full animate-spin mb-3" />
                      <span className="text-sm text-gray-500">アップロード中...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-10 h-10 text-gray-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <p className="text-sm text-gray-600 font-medium">ここにファイルをドロップ</p>
                      <p className="text-xs text-gray-400 mt-1">または</p>
                      <button className="mt-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                        ファイルを選択する
                      </button>
                    </>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp,application/pdf"
                    className="hidden"
                    multiple
                    onChange={handleFileSelect}
                  />
                  <p className="text-[10px] text-gray-300 mt-3">※公開リンクが作成されるため個人情報の取り扱いに注意してください</p>
                </div>

                {/* ファイル形式スペック */}
                <div className="w-[360px] flex-shrink-0">
                  <table className="w-full text-xs">
                    <tbody>
                      <tr className="border-b border-gray-100">
                        <td className="py-2 pr-3 text-gray-500 font-medium whitespace-nowrap">画像</td>
                        <td className="py-2 text-gray-600">10MBまで、jpg,png,gif画像のみ可<br />※アニメーション画像は再生されない場合があります</td>
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="py-2 pr-3 text-gray-500 font-medium whitespace-nowrap">メニュー画像</td>
                        <td className="py-2 text-gray-600">1MBまで、jpg,png画像、サイズは2500×1686pxまたは2500×843pxのみ可</td>
                      </tr>
                      <tr>
                        <td className="py-2 pr-3 text-gray-500 font-medium whitespace-nowrap">PDF</td>
                        <td className="py-2 text-gray-600">10MBまで</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* フィルター & 検索 */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                {(Object.keys(FILE_TYPE_LABELS) as FileTypeFilter[]).map((type) => {
                  const badge = getFileTypeBadge(type);
                  return (
                    <label key={type} className="flex items-center gap-1.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={typeFilters.has(type)}
                        onChange={() => toggleFilter(type)}
                        className="w-4 h-4 rounded border-gray-300 text-green-500 focus:ring-green-500/30"
                      />
                      <span className="text-sm text-gray-600">{FILE_TYPE_LABELS[type]}</span>
                    </label>
                  );
                })}
              </div>
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="メディア名を検索"
                  className="w-56 px-4 py-2 pl-9 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400 bg-white"
                />
                <svg className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>

            {/* ファイル一覧 */}
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-8 h-8 border-2 border-green-200 border-t-green-500 rounded-full animate-spin" />
                  <span className="text-sm text-gray-400">読み込み中...</span>
                </div>
              </div>
            ) : filteredFiles.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-gray-100">
                <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-emerald-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-gray-400 text-sm">メディアがありません</p>
                <p className="text-gray-300 text-xs mt-1">ファイルをドラッグ&ドロップまたは選択してアップロード</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {filteredFiles.map((file) => {
                  const badge = getFileTypeBadge(file.file_type);
                  return (
                    <div key={file.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden group hover:shadow-md transition-shadow">
                      {/* サムネイル */}
                      <div
                        className="aspect-square bg-gray-50 relative overflow-hidden cursor-pointer"
                        onClick={() => setPreviewFile(file)}
                      >
                        {getFileTypeIcon(file)}
                        <div className="absolute top-2 left-2">
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold ${badge.bg} ${badge.text}`}>
                            {badge.label}
                          </span>
                        </div>
                      </div>

                      {/* 情報 */}
                      <div className="px-3 py-2.5">
                        <p className="text-xs font-medium text-gray-800 truncate" title={file.name}>{file.name}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          登録 : {formatDate(file.created_at)}
                        </p>
                        <p className="text-[10px] text-gray-400">
                          {formatSize(file.file_size)}
                        </p>
                      </div>

                      {/* アクションボタン */}
                      <div className="px-3 pb-2.5 flex items-center gap-1">
                        {/* 名前変更 */}
                        <button
                          onClick={() => { setRenamingFile(file); setNewFileName(file.name); setShowRenameModal(true); }}
                          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                          title="名前変更"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                        {/* フォルダ移動 */}
                        <button
                          onClick={() => setMoveFile(file)}
                          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                          title="フォルダ移動"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                          </svg>
                        </button>
                        {/* ダウンロード */}
                        <a
                          href={file.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          download={file.name}
                          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                          title="ダウンロード"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                        </a>
                        {/* 削除 */}
                        <button
                          onClick={() => setDeleteConfirm(file)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors ml-auto"
                          title="削除"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ページネーション */}
            {filteredFiles.length > 0 && (
              <div className="flex items-center justify-between mt-6">
                <p className="text-xs text-gray-400">{filteredFiles.length}件のメディア</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* アップロード種別選択モーダル */}
      {showUploadTypeModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => { setShowUploadTypeModal(false); setPendingFiles([]); }}>
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-900">ファイル種別を選択</h2>
              <p className="text-xs text-gray-400 mt-1">{pendingFiles.length}件のファイルをアップロード</p>
            </div>
            <div className="px-6 py-4 space-y-2">
              {(Object.keys(FILE_TYPE_LABELS) as FileTypeFilter[]).map((type) => (
                <button
                  key={type}
                  onClick={() => handleUpload(type)}
                  className="w-full px-4 py-3 text-left border border-gray-200 rounded-xl hover:bg-green-50 hover:border-green-300 transition-colors flex items-center justify-between group"
                >
                  <div>
                    <span className="text-sm font-medium text-gray-800">{FILE_TYPE_LABELS[type]}</span>
                    <p className="text-[11px] text-gray-400 mt-0.5">{FILE_TYPE_SPECS[type].maxSize}まで、{FILE_TYPE_SPECS[type].formats}</p>
                  </div>
                  <svg className="w-4 h-4 text-gray-300 group-hover:text-green-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ))}
            </div>
            <div className="px-6 py-3 border-t border-gray-100">
              <button
                onClick={() => { setShowUploadTypeModal(false); setPendingFiles([]); }}
                className="w-full px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 text-sm font-medium transition-colors"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}

      {/* フォルダ作成/編集モーダル */}
      {showFolderModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => { setShowFolderModal(false); setEditingFolder(null); }}>
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-900">{editingFolder ? "フォルダ名変更" : "新しいフォルダ"}</h2>
            </div>
            <div className="px-6 py-5">
              <input
                type="text"
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                placeholder="フォルダ名"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400 bg-gray-50/50"
                autoFocus
                onKeyDown={(e) => { if (e.key === "Enter") handleCreateFolder(); }}
              />
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
              <button onClick={() => { setShowFolderModal(false); setEditingFolder(null); }} className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 text-sm font-medium">
                キャンセル
              </button>
              <button
                onClick={handleCreateFolder}
                disabled={!folderName.trim() || saving}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-[#06C755] to-[#05a648] text-white rounded-xl disabled:opacity-40 text-sm font-medium shadow-lg shadow-green-500/25"
              >
                {saving ? "保存中..." : editingFolder ? "変更" : "作成"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ファイル名変更モーダル */}
      {showRenameModal && renamingFile && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => { setShowRenameModal(false); setRenamingFile(null); }}>
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-900">ファイル名変更</h2>
            </div>
            <div className="px-6 py-5">
              <input
                type="text"
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                placeholder="新しいファイル名"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400 bg-gray-50/50"
                autoFocus
                onKeyDown={(e) => { if (e.key === "Enter") handleRename(); }}
              />
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
              <button onClick={() => { setShowRenameModal(false); setRenamingFile(null); }} className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 text-sm font-medium">
                キャンセル
              </button>
              <button
                onClick={handleRename}
                disabled={!newFileName.trim() || saving}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-[#06C755] to-[#05a648] text-white rounded-xl disabled:opacity-40 text-sm font-medium shadow-lg shadow-green-500/25"
              >
                {saving ? "変更中..." : "変更"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* フォルダ移動モーダル */}
      {moveFile && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setMoveFile(null)}>
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-900">フォルダに移動</h2>
              <p className="text-xs text-gray-400 mt-1 truncate">{moveFile.name}</p>
            </div>
            <div className="px-6 py-3 max-h-[300px] overflow-y-auto">
              {folders.map((folder) => (
                <button
                  key={folder.id}
                  onClick={() => handleMoveToFolder(folder.id)}
                  className={`w-full px-4 py-2.5 text-left text-sm flex items-center gap-2 rounded-xl hover:bg-green-50 transition-colors ${
                    moveFile.folder_id === folder.id ? "bg-green-50 text-[#06C755] font-medium" : "text-gray-600"
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                  {folder.name}
                  {moveFile.folder_id === folder.id && (
                    <svg className="w-4 h-4 ml-auto text-[#06C755]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
            <div className="px-6 py-3 border-t border-gray-100">
              <button onClick={() => setMoveFile(null)} className="w-full px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 text-sm font-medium">
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}

      {/* プレビューモーダル */}
      {previewFile && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setPreviewFile(null)}>
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
              <div className="min-w-0">
                <h2 className="font-bold text-gray-900 text-sm truncate">{previewFile.name}</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  {getFileTypeBadge(previewFile.file_type).label} / {formatSize(previewFile.file_size)} / {formatDate(previewFile.created_at)}
                </p>
              </div>
              <button onClick={() => setPreviewFile(null)} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 flex-shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-auto p-6 flex items-center justify-center bg-gray-50">
              {previewFile.file_type === "pdf" ? (
                <div className="text-center">
                  <svg className="w-16 h-16 text-red-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  <p className="text-sm text-gray-500 mb-3">PDFファイル</p>
                  <a
                    href={previewFile.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-red-500 text-white rounded-xl text-sm font-medium hover:bg-red-600 transition-colors inline-flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    PDFを開く
                  </a>
                </div>
              ) : (
                <img
                  src={previewFile.file_url}
                  alt={previewFile.name}
                  className="max-w-full max-h-[60vh] object-contain rounded-lg"
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* 削除確認モーダル */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setDeleteConfirm(null)}>
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h3 className="font-bold text-gray-900 mb-1">メディアを削除</h3>
              <p className="text-sm text-gray-500 mb-1 truncate max-w-full">{deleteConfirm.name}</p>
              <p className="text-xs text-gray-400 mb-5">この操作は取り消せません。ストレージからも削除されます。</p>
              <div className="flex gap-3 w-full">
                <button onClick={() => setDeleteConfirm(null)} className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 text-sm font-medium">
                  キャンセル
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 px-4 py-2.5 bg-red-500 text-white rounded-xl hover:bg-red-600 text-sm font-medium shadow-lg shadow-red-500/25"
                >
                  削除する
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* フォルダ削除確認モーダル */}
      {deleteFolderConfirm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setDeleteFolderConfirm(null)}>
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
              </div>
              <h3 className="font-bold text-gray-900 mb-1">フォルダを削除</h3>
              <p className="text-sm text-gray-500 mb-1">「{deleteFolderConfirm.name}」を削除しますか？</p>
              <p className="text-xs text-gray-400 mb-5">フォルダ内のファイルは「未分類」に移動されます。</p>
              <div className="flex gap-3 w-full">
                <button onClick={() => setDeleteFolderConfirm(null)} className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 text-sm font-medium">
                  キャンセル
                </button>
                <button
                  onClick={handleDeleteFolder}
                  className="flex-1 px-4 py-2.5 bg-red-500 text-white rounded-xl hover:bg-red-600 text-sm font-medium shadow-lg shadow-red-500/25"
                >
                  削除する
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* 圧縮確認モーダル */}
      {compressConfirm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => { setCompressConfirm(null); setPendingFiles([]); }}>
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="font-bold text-gray-900 mb-1">画像サイズが1MBを超えています</h3>
              <p className="text-xs text-gray-400 mb-3">メニュー画像はLINE APIの制限で1MB以下が必要です</p>
              <div className="w-full bg-gray-50 rounded-xl p-3 mb-4 text-left space-y-1">
                {compressConfirm.files.map((f, i) => (
                  <p key={i} className="text-xs text-gray-600 truncate">
                    {f.name} <span className="text-amber-600 font-medium">({(f.size / (1024 * 1024)).toFixed(2)}MB)</span>
                  </p>
                ))}
              </div>
              <div className="flex gap-3 w-full">
                <button
                  onClick={() => { setCompressConfirm(null); setPendingFiles([]); }}
                  className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 text-sm font-medium"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleCompressAndUpload}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-[#06C755] to-[#05a648] text-white rounded-xl text-sm font-medium shadow-lg shadow-green-500/25 hover:shadow-green-500/40 transition-shadow"
                >
                  圧縮してアップロード
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
