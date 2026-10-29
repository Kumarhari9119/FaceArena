
import { database, authReady } from "./firebase.js";

import {
  ref,
  query,
  orderByChild,
  equalTo,
  get
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-database.js";

const photoCount = document.getElementById("myPhotoCount");
const ratingCount = document.getElementById("myRatingCount");
const averageLabel = document.getElementById("myAverageRating");
const message = document.getElementById("profileMessage");
const grid = document.getElementById("myUploadsGrid");

async function loadMyProfile() {
  grid.replaceChildren();
  message.hidden = false;
  message.textContent = "Loading your uploads...";

  try {
    const user = await authReady;

    const approvedQuery = query(
      ref(database, "uploads"),
      orderByChild("status"),
      equalTo("approved")
    );

    const snapshot = await get(approvedQuery);
    const data = snapshot.val() || {};

    // Show only approved photos belonging to this guest UID.
    const uploads = Object.entries(data)
      .map(([id, item]) => ({ id, ...item }))
      .filter(item =>
        item &&
        item.userId === user.uid &&
        item.status === "approved" &&
        typeof item.imageUrl === "string" &&
        item.imageUrl.startsWith("https://res.cloudinary.com/")
      )
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    let totalRatingsReceived = 0;
    let totalRatingPoints = 0;

    const cards = await Promise.all(
      uploads.map(async item => {
        const ratingsSnapshot = await get(
          ref(database, `ratings/${item.id}`)
        );

        const ratingData = ratingsSnapshot.val() || {};

        const values = Object.values(ratingData).filter(
          value =>
            Number.isInteger(value) &&
            value >= 1 &&
            value <= 5
        );

        const count = values.length;
        const average = count
          ? values.reduce((sum, value) => sum + value, 0) / count
          : 0;

        totalRatingsReceived += count;
        totalRatingPoints += values.reduce((sum, value) => sum + value, 0);

        return {
          ...item,
          ratingCount: count,
          averageRating: average
        };
      })
    );

    photoCount.textContent = String(uploads.length);
    ratingCount.textContent = String(totalRatingsReceived);
    averageLabel.textContent = totalRatingsReceived
      ? (totalRatingPoints / totalRatingsReceived).toFixed(1) + " / 5"
      : "—";

    if (!uploads.length) {
      message.textContent =
        "No approved uploads found for this guest session yet. Upload a photo to get started.";
      return;
    }

    message.hidden = true;

    cards.forEach(item => {
      const card = document.createElement("article");
      card.className = "profile-photo-card";

      const image = document.createElement("img");
      image.src = item.imageUrl;
      image.alt = `Photo uploaded by ${item.nickname || "contestant"}`;
      image.loading = "lazy";

      const body = document.createElement("div");
      body.className = "profile-photo-body";

      const title = document.createElement("h3");
      title.textContent = item.nickname || "Anonymous contestant";

      const country = document.createElement("p");
      country.textContent = item.country || "Country not provided";

      const age = document.createElement("p");
      age.textContent = item.age ? `Age: ${item.age}` : "";

      const rating = document.createElement("p");
      rating.className = "profile-photo-rating";
      rating.textContent = item.ratingCount
        ? `★ ${item.averageRating.toFixed(1)} / 5 · ${item.ratingCount} rating${item.ratingCount === 1 ? "" : "s"}`
        : "★ No ratings yet";

      const status = document.createElement("p");
      status.textContent = "✓ Approved";

      body.append(title, country, age, rating, status);
      card.append(image, body);
      grid.append(card);
    });
  } catch (error) {
    console.error("FaceArena profile error:", error);
    message.hidden = false;
    message.textContent =
      "Could not load your profile. Please refresh and check Firebase Rules.";
  }
}

loadMyProfile();
