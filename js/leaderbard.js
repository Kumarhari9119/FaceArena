
import { database, authReady } from "./firebase.js";

import {
  ref,
  query,
  orderByChild,
  equalTo,
  get
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-database.js";

const list = document.getElementById("leaderboardList");
const message = document.getElementById("leaderboardMessage");
const countLabel = document.getElementById("leaderboardCount");
const refreshButton = document.getElementById("leaderboardRefresh");

async function loadLeaderboard() {
  list.replaceChildren();
  message.hidden = false;
  message.textContent = "Loading the latest rankings...";
  countLabel.textContent = "Loading...";
  refreshButton.disabled = true;

  try {
    await authReady;

    const approvedQuery = query(
      ref(database, "uploads"),
      orderByChild("status"),
      equalTo("approved")
    );

    const uploadsSnapshot = await get(approvedQuery);
    const uploadsData = uploadsSnapshot.val() || {};

    const uploads = Object.entries(uploadsData)
      .map(([id, item]) => ({ id, ...item }))
      .filter(item =>
        item &&
        item.status === "approved" &&
        typeof item.imageUrl === "string" &&
        item.imageUrl.startsWith("https://res.cloudinary.com/")
      );

    const ranked = await Promise.all(
      uploads.map(async item => {
        const ratingSnapshot = await get(
          ref(database, `ratings/${item.id}`)
        );

        const ratingData = ratingSnapshot.val() || {};

        const ratings = Object.values(ratingData).filter(
          value =>
            Number.isInteger(value) &&
            value >= 1 &&
            value <= 5
        );

        const totalRatings = ratings.length;

        const averageRating = totalRatings
          ? ratings.reduce((sum, value) => sum + value, 0) /
            totalRatings
          : 0;

        return {
          ...item,
          totalRatings,
          averageRating
        };
      })
    );

    // Highest average first; break ties by rating count.
    ranked.sort((a, b) =>
      b.averageRating - a.averageRating ||
      b.totalRatings - a.totalRatings ||
      (b.createdAt || 0) - (a.createdAt || 0)
    );

    countLabel.textContent =
      `${ranked.length} approved photo${ranked.length === 1 ? "" : "s"}`;

    if (!ranked.length) {
      message.textContent = "No approved photos are available yet.";
      return;
    }

    message.hidden = true;

    ranked.forEach((item, index) => {
      const row = document.createElement("article");
      row.className = "leaderboard-row";

      const rank = document.createElement("div");
      rank.className = "leaderboard-rank";

      const medals = ["🥇", "🥈", "🥉"];
      rank.textContent = index < 3
        ? medals[index]
        : `#${index + 1}`;

      const image = document.createElement("img");
      image.className = "leaderboard-photo";
      image.src = item.imageUrl;
      image.alt = `Photo by ${item.nickname || "contestant"}`;
      image.loading = "lazy";

      const person = document.createElement("div");
      person.className = "leaderboard-person";

      const name = document.createElement("h2");
      name.textContent = item.nickname || "Anonymous contestant";

      const country = document.createElement("p");
      country.textContent = item.country || "Country not provided";

      const ratingInfo = document.createElement("p");
      ratingInfo.textContent = item.totalRatings
        ? `${item.totalRatings} rating${item.totalRatings === 1 ? "" : "s"}`
        : "Waiting for first rating";

      person.append(name, country, ratingInfo);

      const score = document.createElement("div");
      score.className = "leaderboard-score";

      const average = document.createElement("strong");
      average.textContent = item.totalRatings
        ? `★ ${item.averageRating.toFixed(1)}`
        : "—";

      const outOf = document.createElement("span");
      outOf.textContent = item.totalRatings ? " / 5" : "No rating";

      score.append(average, outOf);
      row.append(rank, image, person, score);
      list.append(row);
    });
  } catch (error) {
    console.error("FaceArena leaderboard error:", error);
    countLabel.textContent = "Rankings unavailable";
    message.hidden = false;
    message.textContent =
      "Could not load rankings. Check Firebase Rules and refresh.";
  } finally {
    refreshButton.disabled = false;
  }
}

refreshButton.addEventListener("click", loadLeaderboard);

loadLeaderboard();
