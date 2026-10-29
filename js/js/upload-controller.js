
import {
  authReady,
  db,
  collection,
  addDoc,
  serverTimestamp
} from "./firebase.js";

// Cloudinary dashboard ki values yahan bharo.
const CLOUD_NAME = "zbgalhqw";
const UPLOAD_PRESET = "facearena upload imagesAD_PRESET";

const input = document.getElementById("imageInput");
console.log("Upload controller loaded");
console.log("Image input:", input);
console.log("Browse button:", document.getElementById("browseBtn"));
const dropZone = document.getElementById("dropZone");
const previewImage = document.getElementById("previewImage");
const previewCard = document.getElementById("previewCard");
const form = document.getElementById("guestUploadForm");
const progressText = document.querySelector(".progress-text");

let selectedFile = null;
let previewUrl = null;

function showMessage(message) {
  if (progressText) progressText.textContent = message;
  console.log("FaceArena upload:", message);
}

function selectImage(file) {
  if (!file) return;

  if (!file.type.startsWith("image/")) {
    showMessage("Please select an image file.");
    return;
  }

  if (file.size > 5 * 1024 * 1024) {
    showMessage("Image must be 5 MB or smaller.");
    return;
  }

  selectedFile = file;

  if (previewUrl) URL.revokeObjectURL(previewUrl);
  previewUrl = URL.createObjectURL(file);

  if (previewImage) previewImage.src = previewUrl;
  if (previewCard) previewCard.hidden = false;

  showMessage(`Selected: ${file.name}`);
}

input?.addEventListener("change", () => {
  selectImage(input.files?.[0]);
});

browseBtn?.addEventListener("click", () => {
  input?.click();
});

dropZone?.addEventListener("click", (event) => {
  if (event.target.closest("#browseBtn")) return;
  input?.click();
});

dropZone?.addEventListener("dragover", (event) => {
  event.preventDefault();
  dropZone.classList.add("is-dragover");
});

dropZone?.addEventListener("dragleave", () => {
  dropZone.classList.remove("is-dragover");
});

dropZone?.addEventListener("drop", (event) => {
  event.preventDefault();
  dropZone.classList.remove("is-dragover");
  selectImage(event.dataTransfer?.files?.[0]);
});

function uploadToCloudinary(file) {
  return new Promise((resolve, reject) => {
    const url =
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;

    const data = new FormData();
    data.append("file", file);
    data.append("upload_preset", UPLOAD_PRESET);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        showMessage(
          `Uploading image: ${Math.round(
            (event.loaded / event.total) * 100
          )}%`
        );
      }
    };

    xhr.onload = () => {
      let result;

      try {
        result = JSON.parse(xhr.responseText);
      } catch {
        reject(new Error("Invalid response from image hosting."));
        return;
      }

      if (xhr.status >= 200 && xhr.status < 300 && result.secure_url) {
        resolve(result.secure_url);
      } else {
        reject(new Error(result.error?.message || "Image upload failed."));
      }
    };

    xhr.onerror = () => reject(new Error("Network error during upload."));
    xhr.send(data);
  });
}

form?.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!selectedFile) {
    showMessage("Please choose an image first.");
    return;
  }

  if (
    CLOUD_NAME === "YOUR_CLOUD_NAME" ||
    UPLOAD_PRESET === "YOUR_UNSIGNED_UPLOAD_PRESET"
  ) {
    showMessage("Add your Cloudinary cloud name and upload preset first.");
    return;
  }

  const submitButton = form.querySelector('[type="submit"]');

  try {
    if (submitButton) submitButton.disabled = true;

    showMessage("Checking guest authentication...");
    const user = await authReady;

    showMessage("Uploading image...");
    const imageUrl = await uploadToCloudinary(selectedFile);

    showMessage("Saving photo record...");
    await addDoc(collection(db, "photos"), {
      ownerUid: user.uid,
      imageUrl: imageUrl,
      status: "pending",
      createdAt: serverTimestamp()
    });

    showMessage("Upload successful! Your photo is pending approval.");
    form.reset();
    selectedFile = null;

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = null;

    if (previewImage) {
      previewImage.removeAttribute("src");
    }

    if (previewCard) previewCard.hidden = true;
  } catch (error) {
    console.error("FaceArena upload error:", error);
    showMessage(`Upload failed: ${error.message}`);
  } finally {
    if (submitButton) submitButton.disabled = false;
  }
});
