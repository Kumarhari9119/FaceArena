
document.addEventListener("DOMContentLoaded", function () {
  const CLOUD_NAME = "zbgalhqw";
  const UPLOAD_PRESET = "facearena upload images";

  const form = document.getElementById("guestUploadForm");
  const imageInput = document.getElementById("imageInput");
  const progressBar = document.getElementById("uploadProgressBar");
  const progressText = document.getElementById("uploadProgressText");
  const submitButton = form.querySelector('button[type="submit"]');

  if (!imageInput) {
    console.error("FaceArena: #imageInput was not found.");
    progressText.textContent = "Image selector not found. Check upload.html.";
    return;
  }

  let uploadedImageUrl = "";

  form.addEventListener("submit", async function (event) {
    event.preventDefault();

    const file = imageInput.files && imageInput.files[0];

    if (!file) {
      progressText.textContent = "Please select an image first.";
      return;
    }

    if (!file.type.startsWith("image/")) {
      progressText.textContent = "Please select a valid image.";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      progressText.textContent = "Image size must be 5 MB or less.";
      return;
    }

    if (!form.reportValidity()) return;

    if (typeof window.uploadFiles !== "function") {
      progressText.textContent = "Upload utility not loaded. Refresh the page.";
      console.error("window.uploadFiles is unavailable.");
      return;
    }

    const nickname = document.getElementById("guestNickname").value.trim();
    const age = Number(document.getElementById("guestAge").value);
    const gender = document.getElementById("guestGender").value;
    const country = document.getElementById("guestCountry").value.trim();
    const ownership = document.getElementById("photoOwnership").checked;
    const rulesAccepted = document.getElementById("communityRules").checked;

    if (!ownership || !rulesAccepted) {
      progressText.textContent = "Please accept both confirmations.";
      return;
    }

    const uploadURL =
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;

    submitButton.disabled = true;
    progressBar.style.width = "0%";
    progressText.textContent = "Uploading image...";
    uploadedImageUrl = "";

    try {
      const result = await window.uploadFiles({
        url: uploadURL,
        files: file,
        fieldName: "file",
        extraData: {
          upload_preset: UPLOAD_PRESET
        },

        onProgress: function (progress) {
          const percent = Math.round(progress.percent);
          progressBar.style.width = percent + "%";
          progressText.textContent = `Uploading: ${percent}%`;
        }
      });

      if (!result || !result.secure_url) {
        throw new Error("Cloudinary did not return a secure image URL.");
      }

      uploadedImageUrl = result.secure_url;

      // Store details temporarily for the next database integration step.
      const uploadDetails = {
        nickname,
        age,
        gender,
        country,
        imageUrl: uploadedImageUrl,
        uploadedAt: new Date().toISOString()
      };

      window.faceArenaPendingUpload = uploadDetails;

      progressBar.style.width = "100%";
      progressText.textContent = "Image uploaded successfully!";

      console.log("Cloudinary upload successful.");
      console.log("Image URL:", uploadedImageUrl);
      console.log("Details ready for database:", uploadDetails);

    } catch (error) {
      console.error("FaceArena upload failed:", error);

      progressText.textContent =
        error.message || "Upload failed. Please try again.";

    } finally {
      submitButton.disabled = false;
    }
  });
});
