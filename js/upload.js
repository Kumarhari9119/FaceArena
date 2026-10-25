(function () {
  function normalizeFiles(input) {
    if (Array.isArray(input)) return input;
    if (input instanceof FileList) return Array.from(input);
    if (input instanceof File) return [input];
    return [];
  }

  function buildFormData(files, extraData = {}, fieldName = 'file') {
    const formData = new FormData();

    Object.entries(extraData || {}).forEach(([key, value]) => {
      if (value === undefined || value === null) return;

      if (Array.isArray(value)) {
        value.forEach((item) => formData.append(key, item));
      } else {
        formData.append(key, value);
      }
    });

    normalizeFiles(files).forEach((file) => formData.append(fieldName, file));
    return formData;
  }

  async function uploadFiles({
    url,
    files,
    method = 'POST',
    headers = {},
    fieldName = 'file',
    extraData = {},
    onProgress,
    onError,
    onSuccess,
  }) {
    if (!url) {
      throw new Error('uploadFiles requires a URL.');
    }

    const selectedFiles = normalizeFiles(files);
    if (!selectedFiles.length) {
      return [];
    }

    const payload = buildFormData(selectedFiles, extraData, fieldName);

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open(method, url, true);

      Object.entries(headers).forEach(([name, value]) => {
        xhr.setRequestHeader(name, value);
      });

      xhr.upload.onprogress = (event) => {
        if (typeof onProgress === 'function' && event.lengthComputable) {
          onProgress({
            loaded: event.loaded,
            total: event.total,
            percent: (event.loaded / event.total) * 100,
          });
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          let response = null;

          try {
            response = xhr.responseText ? JSON.parse(xhr.responseText) : null;
          } catch (error) {
            response = xhr.responseText;
          }

          if (typeof onSuccess === 'function') {
            onSuccess(response, xhr);
          }

          resolve(response);
          return;
        }

        const error = new Error(`Upload failed with status ${xhr.status}`);
        error.status = xhr.status;
        error.response = xhr.responseText;

        if (typeof onError === 'function') {
          onError(error, xhr);
        }

        reject(error);
      };

      xhr.onerror = () => {
        const error = new Error('Upload failed due to a network error.');

        if (typeof onError === 'function') {
          onError(error, xhr);
        }

        reject(error);
      };

      xhr.send(payload);
    });
  }

  function bindUploadInput(options = {}) {
    const { inputSelector, dropZoneSelector, ...uploadOptions } = options;
    const input = inputSelector ? document.querySelector(inputSelector) : null;
    const dropZone = dropZoneSelector ? document.querySelector(dropZoneSelector) : null;

    if (input) {
      input.addEventListener('change', (event) => {
        const files = event.target.files;
        if (files && files.length) {
          uploadFiles({ ...uploadOptions, files });
        }
      });
    }

    if (dropZone) {
      ['dragenter', 'dragover'].forEach((type) => {
        dropZone.addEventListener(type, (event) => {
          event.preventDefault();
          dropZone.classList.add('is-dragover');
        });
      });

      ['dragleave', 'drop'].forEach((type) => {
        dropZone.addEventListener(type, (event) => {
          event.preventDefault();
          dropZone.classList.remove('is-dragover');
        });
      });

      dropZone.addEventListener('drop', (event) => {
        const files = event.dataTransfer && event.dataTransfer.files;
        if (files && files.length) {
          uploadFiles({ ...uploadOptions, files });
        }
      });
    }

    return { input, dropZone };
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { uploadFiles, bindUploadInput, buildFormData };
  }

  if (typeof window !== 'undefined') {
    window.uploadFiles = uploadFiles;
    window.bindUploadInput = bindUploadInput;
  }
})();
