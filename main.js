document.addEventListener("DOMContentLoaded", () => {
	initLocationDirectory().catch((error) => {
		console.error("Не удалось инициализировать список локаций", error);
	});
});

async function initLocationDirectory() {
	const listContainer = document.getElementById("objectsList");
	const emptyState = document.getElementById("objectsEmpty");
	const counterElement = document.querySelector("[data-location-count]");
	const searchInput = document.getElementById("objectSearch");

	if (!listContainer || !emptyState || !counterElement) {
		return;
	}

	let locations = [];
	let filtered = [];

	try {
		const response = await fetch("locations.json", { cache: "no-store" });
		if (!response.ok) {
			throw new Error(`HTTP ${response.status}`);
		}
		const raw = await response.json();
		locations = raw.map(normalizeLocation).filter(Boolean);
	} catch (error) {
		emptyState.classList.remove("hidden");
		emptyState.textContent = "Не удалось загрузить список адресов.";
		throw error;
	}

	filtered = locations;
	renderList(filtered);

	if (searchInput) {
		let timer;
		searchInput.addEventListener("input", (event) => {
			const query = normalizeString(event.target.value);
			clearTimeout(timer);
			timer = setTimeout(() => {
				filtered = applySearch(locations, query);
				renderList(filtered, query);
			}, 150);
		});
	}

	function renderList(items, query = "") {
		listContainer.innerHTML = "";

		if (!items.length) {
			emptyState.classList.remove("hidden");
			counterElement.textContent = "0";
			return;
		}

		emptyState.classList.add("hidden");
		counterElement.textContent = String(items.length);

		const fragment = document.createDocumentFragment();
		items.forEach((location) => {
			fragment.appendChild(createLocationCard(location, query));
		});
		listContainer.appendChild(fragment);
	}
}

function createLocationCard(location, query) {
	const card = document.createElement("article");
	card.className = "object-card";

	const header = document.createElement("div");
	header.className = "object-card__header";

	const title = document.createElement("h3");
	title.className = "object-card__title";
	title.innerHTML = highlightMatch(location.name, query);

	header.appendChild(title);

	if (location.area) {
		const area = document.createElement("span");
		area.className = "object-card__area";
		area.innerHTML = highlightMatch(location.area, query);
		header.appendChild(area);
	}

	const meta = document.createElement("div");
	meta.className = "object-card__meta";
	meta.innerHTML = `
        <span class="object-card__region">${highlightMatch(location.region, query)}</span>
        <span>${highlightMatch(location.address, query)}</span>
        <span class="object-card__phone">${highlightMatch(location.phone.display, query)}</span>
    `;

	const actions = document.createElement("div");
	actions.className = "object-card__actions";

	if (location.phone.tel) {
		const callBtn = document.createElement("a");
		callBtn.className = "btn btn--secondary";
		callBtn.href = `tel:${location.phone.tel}`;
		callBtn.textContent = "Позвонить";
		actions.appendChild(callBtn);
	}

	const routeBtn = document.createElement("a");
	routeBtn.className = "btn btn--ghost";
	routeBtn.href = location.route;
	routeBtn.target = "_blank";
	routeBtn.rel = "noopener";
	routeBtn.textContent = "Маршрут";
	actions.appendChild(routeBtn);

	card.appendChild(header);
	card.appendChild(meta);
	card.appendChild(actions);

	return card;
}

function normalizeLocation(item) {
	if (!item) {
		return null;
	}

	const latitude = Number(item.latitude);
	const longitude = Number(item.longitude);
	const routeRaw = typeof item.route === "string" ? item.route.trim() : "";

	const fallbackRoute =
		Number.isFinite(latitude) && Number.isFinite(longitude)
			? `https://yandex.ru/maps/?rtext=~${latitude},${longitude}`
			: "https://yandex.ru/maps";

	return {
		id: item.id || `loc-${Date.now()}-${Math.random().toString(16).slice(2)}`,
		name: item.name || "Без названия",
		area: item.area || "",
		region: item.region || "Московская область",
		address: item.address || "",
		latitude,
		longitude,
		route: routeRaw || fallbackRoute,
		phone: formatPhone(item.phone),
		searchString: normalizeString(
			`${item.name || ""} ${item.area || ""} ${item.region || ""} ${item.address || ""} ${item.phone || ""} ${item.route || ""}`,
		),
	};
}

function applySearch(locations, query) {
	if (!query) {
		return locations;
	}
	return locations.filter((location) => location.searchString.includes(query));
}

function formatPhone(phone) {
	const digits = (phone || "").replace(/\D/g, "");
	if (!digits) {
		return { tel: "", display: phone ? phone.trim() : "" };
	}

	let normalized = digits;
	if (digits.length === 11 && digits.startsWith("8")) {
		normalized = `7${digits.slice(1)}`;
	} else if (digits.length === 10) {
		normalized = `7${digits}`;
	} else if (digits.length === 11 && digits.startsWith("7")) {
		normalized = digits;
	} else if (digits.length > 11) {
		normalized = digits.slice(-11);
	}

	const tel = `+${normalized}`;
	const display =
		normalized.length >= 11
			? `+${normalized[0]} (${normalized.slice(1, 4)}) ${normalized.slice(4, 7)}-${normalized.slice(7, 9)}-${normalized.slice(9, 11)}`
			: tel;

	return { tel, display };
}

function normalizeString(value) {
	return (value || "")
		.toLowerCase()
		.replace(/ё/g, "е")
		.replace(/\s+/g, " ")
		.trim();
}

function escapeHtml(value) {
	return String(value ?? "")
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");
}

function highlightMatch(text, query) {
	const escapedSource = escapeHtml(text);
	if (!query) {
		return escapedSource;
	}

	const safeQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	const regexp = new RegExp(`(${safeQuery})`, "gi");
	return escapedSource.replace(regexp, "<mark>$1</mark>");
}
