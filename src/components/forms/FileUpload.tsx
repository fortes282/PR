"use client";

import { useRef, useState } from "react";

type FileUploadProps = {
  accept?: string;
  onFileSelect: (file: File) => void;
  label?: string;
  disabled?: boolean;
};

export function FileUpload({
  accept = "*",
  onFileSelect,
  label = "Vybrat soubor",
  disabled = false,
}: FileUploadProps): React.ReactElement {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      onFileSelect(file);
    }
    e.target.value = "";
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleChange}
        disabled={disabled}
        className="sr-only"
        id="file-upload"
        aria-label={label}
      />
      <button
        type="button"
        className="btn-secondary"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
      >
        {label}
      </button>
      {fileName && <span className="ml-2 text-sm text-gray-600">{fileName}</span>}
    </div>
  );
}
