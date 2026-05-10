import { useEffect, useRef, useState } from "react";

export type SelectedFile = {
  file: File;
  previewUrl: string | null;
};

export function useSelectedFilesPreview() {
  const [newFiles, setNewFiles] = useState<SelectedFile[]>([]);
  const newFilesRef = useRef<SelectedFile[]>([]);

  useEffect(() => {
    newFilesRef.current = newFiles;
  }, [newFiles]);

  useEffect(() => {
    return () => {
      newFilesRef.current.forEach((item) => {
        if (item.previewUrl) {
          URL.revokeObjectURL(item.previewUrl);
        }
      });
    };
  }, []);

  const addFiles = (files: FileList | File[]) => {
    const selected = Array.from(files).map((file) => ({
      file,
      previewUrl: file.type.startsWith("image/")
        ? URL.createObjectURL(file)
        : null,
    }));
    setNewFiles((current) => [...current, ...selected]);
  };

  const removeFile = (index: number) => {
    setNewFiles((current) => {
      const target = current[index];

      if (target?.previewUrl) {
        URL.revokeObjectURL(target.previewUrl);
      }

      return current.filter((_, itemIndex) => itemIndex !== index);
    });
  };

  const revokeAll = (files: SelectedFile[]) => {
    files.forEach((item) => {
      if (item.previewUrl) {
        URL.revokeObjectURL(item.previewUrl);
      }
    });
  };

  const clearFiles = () => {
    setNewFiles([]);
  };

  return {
    addFiles,
    clearFiles,
    newFiles,
    removeFile,
    revokeAll,
  };
}
