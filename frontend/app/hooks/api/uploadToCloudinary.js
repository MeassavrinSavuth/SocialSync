// lib/uploadToCloudinary.js
export async function uploadToCloudinary(file) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', 'socialsync_preset'); // Replace with your preset

  const res = await fetch('https://api.cloudinary.com/v1_1/ddchucnpv/auto/upload', {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) throw new Error('Upload to Cloudinary failed');

  const data = await res.json();
  return data.secure_url;
}
