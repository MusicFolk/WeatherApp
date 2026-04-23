let currentFavorites = [];
let currentWeatherPayload = null;
let currentWeatherCity = "";
let isAuthenticated = false;

function setMessage(elementId, text, isError = false) {
  const el = document.getElementById(elementId);
  if (!el) return;

  el.textContent = text;
  el.className = `min-h-5 text-sm ${isError ? "text-red-600" : "text-green-700"}`;
}

function normalizeCity(city) {
  return city.trim().toLowerCase();
}

function getCityFromQuery() {
  return new URLSearchParams(window.location.search).get("city")?.trim() || "";
}

function isCityAlreadyFavorite(city) {
  const normalizedCity = normalizeCity(city);
  return currentFavorites.some(
    (item) => normalizeCity(item.city) === normalizedCity,
  );
}

function isAuthError(error) {
  if (error?.status === 401) {
    return true;
  }

  const message = (error?.message || "").toLowerCase();
  return (
    message.includes("auth") ||
    message.includes("token") ||
    message.includes("expired")
  );
}

async function logout() {
  try {
    await request("/api/logout", { method: "POST" });
  } catch (error) {
    // Always redirect even if the server session was already invalid.
  }

  window.location.href = "/login";
}

async function request(url, options = {}) {
  const response = await fetch(url, {
    credentials: "same-origin",
    ...options,
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.error || "Request failed");
    error.status = response.status;
    error.payload = data;
    throw error;
  }

  return data;
}

async function initializeAuthState() {
  try {
    const authStatus = await request("/api/auth-status");
    isAuthenticated = Boolean(authStatus?.authenticated);
  } catch (error) {
    isAuthenticated = false;
  }
}

async function loadFavoritesState() {
  if (!isAuthenticated) {
    currentFavorites = [];
    return;
  }

  try {
    currentFavorites = await request("/api/favorites");
  } catch (error) {
    currentFavorites = [];

    if (isAuthError(error)) {
      isAuthenticated = false;
    }
  }
}

function updateWeatherAuthActions() {
  const loginBtn = document.getElementById("loginBtn");
  const logoutBtn = document.getElementById("logoutBtn");
  if (!loginBtn || !logoutBtn) return;

  loginBtn.classList.toggle("hidden", isAuthenticated);
  logoutBtn.classList.toggle("hidden", !isAuthenticated);
}

function initAuthPage() {
  const form = document.getElementById("authForm");
  const showLoginBtn = document.getElementById("showLogin");
  const showRegisterBtn = document.getElementById("showRegister");
  const formTitle = document.getElementById("formTitle");
  const submitBtn = document.getElementById("submitBtn");

  let mode = "login";

  function switchMode(nextMode) {
    mode = nextMode;
    const isLogin = mode === "login";

    formTitle.textContent = isLogin ? "Login" : "Register";
    submitBtn.textContent = isLogin ? "Login" : "Register";
    showLoginBtn.className = `w-1/2 rounded-lg px-4 py-2 font-semibold ${isLogin ? "bg-sea" : "bg-white/20"}`;
    showRegisterBtn.className = `w-1/2 rounded-lg px-4 py-2 font-semibold ${!isLogin ? "bg-sea" : "bg-white/20"}`;
    setMessage("authMessage", "");
  }

  showLoginBtn?.addEventListener("click", () => switchMode("login"));
  showRegisterBtn?.addEventListener("click", () => switchMode("register"));

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    if (!email || !password) {
      setMessage("authMessage", "Email and password are required", true);
      return;
    }

    try {
      if (mode === "register") {
        await request("/api/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
      }

      await request("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      window.location.href = "/weather";
    } catch (error) {
      setMessage("authMessage", error.message, true);
    }
  });
}

function renderWeatherCard(payload, city) {
  const card = document.getElementById("weatherCard");
  if (!card) return;

  currentWeatherPayload = payload;
  currentWeatherCity = city;

  const iconUrl = payload.weather.icon.startsWith("//")
    ? `https:${payload.weather.icon}`
    : payload.weather.icon;

  const alreadyFavorite = isCityAlreadyFavorite(city);
  const favoriteContent = alreadyFavorite
    ? '<p class="rounded-lg bg-emerald-100 px-4 py-2 text-sm font-semibold text-emerald-800">Already in favorites</p>'
    : '<button id="saveFavoriteBtn" class="rounded-lg bg-sky-700 px-4 py-2 text-sm font-semibold text-white">Add to favorites</button>';

  card.innerHTML = `
    <h2 class="mb-2 text-lg font-bold">Current Conditions</h2>
    <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
      <div>
        <p class="text-xl font-semibold">${payload.location.name}, ${payload.location.country}</p>
        <p class="text-sm text-slate-600">Local time: ${payload.location.localtime}</p>
        <p class="mt-2 text-4xl font-extrabold">${payload.weather.temperatureC}C</p>
        <p class="text-slate-700">${payload.weather.condition}</p>
        <p class="text-sm text-slate-600">Humidity: ${payload.weather.humidity}% | Wind: ${payload.weather.windKph} kph</p>
      </div>
      <div class="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
        <img src="${iconUrl}" alt="Weather icon" class="h-16 w-16" />
        ${favoriteContent}
      </div>
    </div>
  `;

  const saveBtn = document.getElementById("saveFavoriteBtn");
  saveBtn?.addEventListener("click", async () => {
    try {
      await request("/api/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ city }),
      });
      currentFavorites.push({ city });
      setMessage("weatherMessage", "City added to favorites.");
      renderWeatherCard(currentWeatherPayload, currentWeatherCity);
    } catch (error) {
      if (isAuthError(error)) {
        logout();
      }
      setMessage("weatherMessage", error.message, true);
    }
  });
}

function renderForecast(days) {
  const forecastSection = document.getElementById("forecastSection");
  const forecastGrid = document.getElementById("forecastGrid");
  if (!forecastSection || !forecastGrid) return;

  if (!Array.isArray(days) || days.length === 0) {
    forecastSection.classList.add("hidden");
    forecastGrid.innerHTML = "";
    return;
  }

  forecastSection.classList.remove("hidden");
  forecastGrid.innerHTML = days
    .map((day) => {
      const iconUrl = day.icon.startsWith("//")
        ? `https:${day.icon}`
        : day.icon;
      const dayLabel = new Date(`${day.date}T00:00:00`).toLocaleDateString(
        undefined,
        {
          weekday: "short",
          month: "short",
          day: "numeric",
        },
      );

      return `
      <article class="rounded-xl border border-slate-200 bg-slate-50 p-3">
        <p class="text-sm font-semibold text-slate-700">${dayLabel}</p>
        <img src="${iconUrl}" alt="Forecast icon" class="mt-2 h-10 w-10" />
        <p class="mt-2 text-sm text-slate-700">${day.condition}</p>
        <p class="mt-1 text-sm font-semibold text-slate-900">${Math.round(day.maxTempC)}C / ${Math.round(day.minTempC)}C</p>
        <p class="mt-1 text-xs text-slate-600">Rain chance: ${day.chanceOfRain}%</p>
      </article>
    `;
    })
    .join("");
}

function initWeatherPage() {
  updateWeatherAuthActions();

  document.getElementById("loginBtn")?.addEventListener("click", (event) => {
    if (isAuthenticated) {
      event.preventDefault();
      return;
    }
  });

  document.getElementById("logoutBtn")?.addEventListener("click", logout);

  const weatherForm = document.getElementById("weatherForm");

  weatherForm?.addEventListener("submit", async (event) => {
    event.preventDefault();

    const city = document.getElementById("cityInput").value.trim();
    const country = document.getElementById("countryInput").value.trim();

    if (!city) {
      setMessage("weatherMessage", "Please enter a city.", true);
      return;
    }

    const params = new URLSearchParams({ city });
    if (country) {
      params.set("country", country);
    }

    try {
      setMessage("weatherMessage", "Loading weather...");
      history.replaceState(null, "", `/weather?${params.toString()}`);
      const weather = await request(`/api/weather?${params.toString()}`);
      renderWeatherCard(weather, city);
      const forecast = await request(
        `/api/weather/forecast?${params.toString()}&days=5`,
      );
      renderForecast(forecast.days || []);
      setMessage("weatherMessage", "Weather loaded.");
    } catch (error) {
      renderForecast([]);
      if (isAuthError(error)) {
        logout();
      }
      setMessage("weatherMessage", error.message, true);
    }
  });

  initializeWeatherPage(weatherForm);
}

async function initializeWeatherPage(weatherForm) {
  await loadFavoritesState();
  updateWeatherAuthActions();

  const cityFromQuery = getCityFromQuery();
  if (!cityFromQuery) {
    return;
  }

  const cityInput = document.getElementById("cityInput");
  if (cityInput) {
    cityInput.value = cityFromQuery;
  }

  weatherForm?.requestSubmit();
}

function renderFavorites(items) {
  const grid = document.getElementById("favoritesGrid");
  if (!grid) return;

  if (!items.length) {
    grid.innerHTML =
      '<p class="rounded-xl bg-white p-4 shadow">No favorites yet. Add cities from the search page.</p>';
    return;
  }

  grid.innerHTML = items
    .map(
      (item) => `
      <article class="rounded-2xl bg-white p-4 shadow">
        <p class="text-lg font-semibold">${item.city}</p>
        <div class="mt-3 flex gap-2">
          <a href="/weather?city=${encodeURIComponent(item.city)}" class="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white">View Weather</a>
          <button data-id="${item.id}" class="delete-favorite rounded-lg bg-rose-600 px-3 py-2 text-sm font-semibold text-white">Delete</button>
        </div>
      </article>
    `,
    )
    .join("");

  grid.querySelectorAll(".delete-favorite").forEach((button) => {
    button.addEventListener("click", async () => {
      const id = button.getAttribute("data-id");
      try {
        await request(`/api/favorites/${id}`, {
          method: "DELETE",
        });
        setMessage("favoritesMessage", "Favorite removed.");
        await loadFavorites();
      } catch (error) {
        if (isAuthError(error)) {
          logout();
        }
        setMessage("favoritesMessage", error.message, true);
      }
    });
  });
}

async function loadFavorites() {
  try {
    currentFavorites = await request("/api/favorites");
    renderFavorites(currentFavorites);
    setMessage("favoritesMessage", "Favorites loaded.");
  } catch (error) {
    if (isAuthError(error)) {
      logout();
    }
    setMessage("favoritesMessage", error.message, true);
  }
}

function initFavoritesPage() {
  document.getElementById("logoutBtn")?.addEventListener("click", logout);
  loadFavorites();
}

(async function initApp() {
  const page = document.body.getAttribute("data-page");

  await initializeAuthState();

  if (page === "auth") {
    initAuthPage();
  }

  if (page === "weather") {
    initWeatherPage();
  }

  if (page === "favorites") {
    initFavoritesPage();
  }
})();
