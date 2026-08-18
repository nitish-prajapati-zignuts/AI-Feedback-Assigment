"use client";

import React from "react";
import dynamic from "next/dynamic";

const Editor = dynamic(
  () => import("@tinymce/tinymce-react").then((mod) => mod.Editor),
  { ssr: false }
);

interface RichTextEditorProps {
  value: string;
  onChange: (val: string) => void;
  height?: number;
}

export default function RichTextEditor({ value, onChange, height = 250 }: RichTextEditorProps) {
  return (
    <Editor
      tinymceScriptSrc="https://cdnjs.cloudflare.com/ajax/libs/tinymce/6.8.2/tinymce.min.js"
      value={value}
      onEditorChange={onChange}
      init={{
        height: height,
        menubar: false,
        plugins: [
          'advlist', 'autolink', 'lists', 'link', 'charmap', 'preview',
          'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
          'insertdatetime', 'table', 'code', 'help', 'wordcount'
        ],
        toolbar: 'undo redo | blocks | ' +
          'bold italic forecolor | alignleft aligncenter ' +
          'alignright alignjustify | bullist numlist outdent indent | ' +
          'removeformat | help',
        content_style: 'body { font-family:Helvetica,Arial,sans-serif; font-size:14px; background: #121212; color: #ffffff; }',
        skin: 'oxide-dark',
        content_css: 'dark'
      }}
    />
  );
}
