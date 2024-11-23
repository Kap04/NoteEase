import React, { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import * as XLSX from 'xlsx';

interface FileUploadProps {
  onFileUpload: (parsedContent: string) => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileUpload }) => {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const parseFile = async (file: File) => {
    const fileExtension = file.name.split('.').pop()?.toLowerCase();

    try {
      let extractedText = '';

      switch (fileExtension) {
        case 'xlsx':
        case 'xls':
          const reader = new FileReader();
          reader.onload = (e) => {
            const workbook = XLSX.read(e.target?.result, { type: 'binary' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);
            extractedText = jsonData.map(row => 
              Object.values(row as Record<string, unknown>).join(' ')
            ).join('\n');
            onFileUpload(extractedText);
            setUploadedFile(file);
          };
          reader.readAsBinaryString(file);
          break;

        case 'json':
          const jsonReader = new FileReader();
          jsonReader.onload = (e) => {
            try {
              const jsonData = JSON.parse(e.target?.result as string);
              extractedText = JSON.stringify(jsonData, null, 2);
              onFileUpload(extractedText);
              setUploadedFile(file);
            } catch (error) {
              console.error('Error parsing JSON', error);
            }
          };
          jsonReader.readAsText(file);
          break;

        case 'txt':
          const txtReader = new FileReader();
          txtReader.onload = (e) => {
            extractedText = e.target?.result as string;
            onFileUpload(extractedText);
            setUploadedFile(file);
          };
          txtReader.readAsText(file);
          break;

        case 'pdf':
          extractedText = 'PDF parsing not supported. Please convert to text first.';
          onFileUpload(extractedText);
          setUploadedFile(file);
          break;

        default:
          console.error('Unsupported file type');
      }
    } catch (error) {
      console.error('Error parsing file', error);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'text/csv': ['.csv'],
      'application/json': ['.json'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/plain': ['.txt']
    },
    onDrop: (acceptedFiles) => {
      const file = acceptedFiles[0];
      if (file) {
        parseFile(file);
      }
    }
  });

  return (
    <div
      {...getRootProps()}
      className={`p-4 border-2 border-dashed h-40 rounded-lg text-center cursor-pointer 
        ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-500'}`}
    >
      <input {...getInputProps()} />
      {uploadedFile ? (
        <p className="text-green-600">
          Uploaded: {uploadedFile.name}
        </p>
      ) : (
        <p>
          Drag 'n' drop your notes
        </p>
      )}
    </div>
  );
};

export default FileUpload;