const MAX_SIDE = 1600;

const toBlob = (canvas, type, quality) => new Promise((resolve, reject) => {
  canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('encode failed'))), type, quality);
});

const loadImage = (src) => new Promise((resolve, reject) => {
  const img = new Image();
  img.onload = () => resolve(img);
  img.onerror = reject;
  img.src = src;
});

/** 올리기 전에 줄여서 JPEG로 바꾼다. 다시 그리면서 사진 속 위치정보도 빠진다 */
export const prepareUpload = async (file) => {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return toBlob(canvas, 'image/jpeg', 0.9);
};

/** 내려받는 사진에는 AI로 만든 이미지라는 표시를 넣는다 */
export const stampAndDownload = async (dataUrl, label, fileName) => {
  const img = await loadImage(dataUrl);
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);

  const size = Math.max(14, Math.round(canvas.width / 32));
  const pad = Math.round(size / 2);
  ctx.font = `600 ${size}px sans-serif`;
  const boxWidth = ctx.measureText(label).width + pad * 2;
  const boxHeight = size + pad * 2;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.fillRect(canvas.width - boxWidth, canvas.height - boxHeight, boxWidth, boxHeight);
  ctx.fillStyle = '#fff';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, canvas.width - boxWidth + pad, canvas.height - boxHeight / 2);

  const url = URL.createObjectURL(await toBlob(canvas, 'image/png'));
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000); // 다운로드가 시작될 시간을 준다
};
