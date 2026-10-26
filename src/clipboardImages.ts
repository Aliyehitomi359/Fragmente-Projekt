export function clipboardImages(data: {
  items: ArrayLike<Pick<DataTransferItem, 'kind' | 'type' | 'getAsFile'>>;
  files: ArrayLike<File>;
}, date = new Date()): File[] {
  const itemFiles = Array.from(data.items).filter((item) => item.kind === 'file' && item.type.startsWith('image/'))
    .map((item) => item.getAsFile()).filter((file): file is File => file !== null);
  const files = itemFiles.length ? itemFiles : Array.from(data.files).filter((file) => file.type.startsWith('image/'));
  const pad = (value: number) => String(value).padStart(2, '0');
  const stamp = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}-${pad(date.getMinutes())}-${pad(date.getSeconds())}`;
  return files.map((file, index) => {
    const extension = ({ 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' } as Record<string, string>)[file.type] ?? 'png';
    return new File([file], `${stamp}${files.length > 1 ? `-${index + 1}` : ''}.${extension}`, { type: file.type, lastModified: date.getTime() });
  });
}
