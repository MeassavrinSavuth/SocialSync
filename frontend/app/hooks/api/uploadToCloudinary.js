export async function uploadToCloudinary(file, onProgress, signal) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    // Use your Cloudinary details directly here as provided
    const CLOUDINARY_CLOUD_NAME = 'ddchucnpv';
    const CLOUDINARY_UPLOAD_PRESET = 'socialsync_preset';

    xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`);

    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable && onProgress) {
        const percent = Math.round((event.loaded / event.total) * 100);
        onProgress(percent);
      }
    });

    xhr.onreadystatechange = () => {
      if (xhr.readyState === 4) { // Request is complete
        // IMPORTANT: First, check if the request was explicitly aborted
        if (signal && signal.aborted) {
          reject(new DOMException('Upload aborted', 'AbortError'));
          return; // Exit to prevent further status processing
        }

        // Handle successful responses (HTTP status codes 200-299)
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve(response.secure_url);
          } catch (err) {
            // More specific error for parsing issues
            reject(new Error('Failed to parse Cloudinary response.'));
          }
        } else {
          // Handle other HTTP errors (non-2xx statuses)
          let errorMessage = `Upload failed with status ${xhr.status}`;
          try {
            const errorResponse = JSON.parse(xhr.responseText);
            if (errorResponse && errorResponse.error && errorResponse.error.message) {
              errorMessage = `Upload failed: ${errorResponse.error.message} (Status: ${xhr.status})`;
            }
          } catch (e) {
            // responseText was not JSON, use generic message
          }
          reject(new Error(errorMessage));
        }
      }
    };

    // xhr.onerror specifically handles network-level errors
    xhr.onerror = () => reject(new Error('Network error. Please check your internet connection.'));

    if (signal) {
      signal.addEventListener('abort', () => {
        xhr.abort(); // Just abort the XHR; the onreadystatechange will handle the rejection
      }, { once: true }); // Use { once: true } to automatically remove the listener after it fires
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

    xhr.send(formData);
  });
}