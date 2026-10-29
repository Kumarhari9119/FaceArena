
import { database, authReady } from "./firebase.js";

import {
  ref,
  query,
  orderByChild,
  equalTo,
  get,
  set
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-database.js";

const gallery = document.getElementById("arenaGallery");
const message = document.getElementById("arenaMessage");
const countLabel = document.getElementById("arenaCount");
const refreshButton = document.getElementById("arenaRefresh");

function showMessage(text) {
  message.hidden = false;
  message.textContent = text;
}

async function updateRatingDisplay(
  uploadId,
  averageLabel,
  starButtons,
  ratingNote,
  userUid
) {
  const ratingsSnapshot = await get(
    ref(database, `ratings/${uploadId}`)
  );

  const ratings = ratingsSnapshot.val() || {};

  const values = Object.values(ratings).filter(
    value =>
      Number.isInteger(value) &&
      value >= 1 &&
      value <= 5
  );

  const total = values.length;
  const average = total
    ? values.reduce((sum, value) => sum + value, 0) / total
    : 0;

  const myRating = ratings[userUid] || 0;

  averageLabel.textContent = total
    ? `${average.toFixed(1)} / 5 · ${total} rating${total === 1 ? "" : "s"}`
    : "No ratings yet";

  starButtons.forEach((button, index) => {
    const starValue = index + 1;
    button.classList.toggle(
      "is-selected",
      starValue <= myRating
    );
    button.setAttribute(
      "aria-pressed",
      String(starValue === myRating)
    );
  });

  ratingNote.textContent = myRating
    ? `Your rating: ${myRating}/5`
    : "Choose 1–5 stars";
}

async function saveRating(
  uploadId,
  rating,
  averageLabel,
  starButtons,
  ratingNote,
  userUid
) {
  starButtons.forEach(button => {
    button.disabled = true;
  });

  ratingNote.textContent = "Saving your rating...";

  try {
    const user = await authReady;

    // Save one rating per guest UID per photo.
    // Choosing another star updates the same rating.
    await set(
      ref(database, `ratings/${uploadId}/${user.uid}`),
      rating
    );

    await updateRatingDisplay(
      uploadId,
      averageLabel,
      starButtons,
      ratingNote,
      user.uid
    );

    ratingNote.textContent = `Your rating: ${rating}/5 · Saved`;
  } catch (error) {
    console.error("FaceArena rating error:", error);

    ratingNote.textContent =
      "Rating could not be saved. Check Firebase Rules and try again.";
  } finally {
    starButtons.forEach(button => {
      button.disabled = false;
    });
  }
}

function createRatingSection(uploadId, userUid) {
  const section = document.createElement("div");
  section.className = "arena-rating";

  const heading = document.createElement("div");
  heading.className = "arena-rating-heading";
  heading.textContent = "Rate this photo";

  const averageLabel = document.createElement("div");
  averageLabel.className = "arena-rating-average";
  averageLabel.textContent = "Loading ratings...";

  const stars = document.createElement("div");
  stars.className = "arena-rating-stars";
  stars.setAttribute("role", "group");
  stars.setAttribute("aria-label", "Rate this photo from 1 to 5 stars");

  const ratingNote = document.createElement("p");
  ratingNote.className = "arena-rating-note";
  ratingNote.textContent = "Choose 1–5 stars";

  const starButtons = [];

  for (let rating = 1; rating <= 5; rating++) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "arena-rating-star";
    button.textContent = "★";
    button.setAttribute("aria-label", `${rating} out of 5 stars`);
    button.setAttribute("aria-pressed", "false");
    button.title = `Rate ${rating} out of 5`;

    button.addEventListener("click", () => {
      saveRating(
        uploadId,
        rating,
        averageLabel,
        starButtons,
        ratingNote,
        userUid
      );
    });

    starButtons.push(button);
    stars.append(button);
  }

  section.append(
    heading,
    averageLabel,
    stars,
    ratingNote
  );

  updateRatingDisplay(
    uploadId,
    averageLabel,
    starButtons,
    ratingNote,
    userUid
  ).catch(error => {
    console.error("Could not load ratings:", error);
    averageLabel.textContent = "Ratings unavailable";
  });

  return section;
}

async function loadGallery() {
  gallery.replaceChildren();
  countLabel.textContent = "Loading...";
  showMessage("Loading approved photos...");
  refreshButton.disabled = true;

  try {
    const user = await authReady;

    const approvedQuery = query(
      ref(database, "uploads"),
      orderByChild("status"),
      equalTo("approved")
    );

    const snapshot = await get(approvedQuery);
    const data = snapshot.val() || {};

    const uploads = Object.entries(data)
      .map(([id, item]) => ({ id, ...item }))
      .filter(item =>
        item &&
        item.status === "approved" &&
        typeof item.imageUrl === "string" &&
        item.imageUrl.startsWith("https://res.cloudinary.com/")
      )
      .sort((a, b) =>
        (b.createdAt || 0) - (a.createdAt || 0)
      );

    countLabel.textContent =
      `${uploads.length} approved photo${uploads.length === 1 ? "" : "s"}`;

    if (uploads.length === 0) {
      showMessage(
        "No approved photos yet. Submissions will appear here after review."
      );
      return;
    }

    message.hidden = true;

    uploads.forEach(item => {
      const card = document.createElement("article");
      card.className = "arena-card";

      const image = document.createElement("img");
      image.className = "arena-card-image";
      image.src = item.imageUrl;
      image.alt = `Photo by ${item.nickname || "contestant"}`;
      image.loading = "lazy";

      const body = document.createElement("div");
      body.className = "arena-card-body";

      const title = document.createElement("h2");
      title.className = "arena-card-title";
      title.textContent =
        item.nickname || "Anonymous contestant";

      const country = document.createElement("p");
      country.className = "arena-card-country";
      country.textContent =
        item.country || "Country not provided";

      const meta = document.createElement("div");
      meta.className = "arena-card-meta";

      const badge = document.createElement("span");
      badge.className = "arena-status";
      badge.textContent = "✓ Approved";

      const age = document.createElement("span");
      age.className = "arena-card-country";
      age.textContent = item.age ? `Age ${item.age}` : "";

      meta.append(badge, age);

      const ratingSection = createRatingSection(
        item.id,
        user.uid
      );

      body.append(title, country, meta, ratingSection);
      card.append(image, body);
      gallery.append(card);
    });
  } catch (error) {
    console.error("FaceArena gallery error:", error);

    countLabel.textContent = "Gallery unavailable";

    showMessage(
      "Photos could not load. Please check Firebase Rules and refresh."
    );
  } finally {
    refreshButton.disabled = false;
  }
}

refreshButton.addEventListener("click", loadGallery);

loadGallery();
