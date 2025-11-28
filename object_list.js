ymaps.ready(init);

function init() {
	const myMap = new ymaps.Map("map", {
		center: [22.22, 22.22],
		zoom: 1,
	});

	const menuToggle = $('<div class="menu-toggle">☰</div>');
	const menu = $('<div class="map-menu"><div class="close-btn">×</div></div>');

	$("#map-container").append(menuToggle).append(menu);

	menu.addClass("active");

	const groups = [
		{
			name: "Тест",
			style: "islands#redIcon",
			items: [
				{ name: "Тест 1", center: [22.22, 11.11] },
				{ name: "Тест 2", center: [11.11, 22.22] },
			],
		},
	];

	groups.forEach((group) => {
		const collection = new ymaps.GeoObjectCollection();
		myMap.geoObjects.add(collection);

		const menuGroup = $(`
            <div class="menu-group">
                <label>
                    <input type="checkbox" checked>
                    <span class="group-name">${group.name}</span>
                </label>
            </div>
        `);

		const submenu = $('<ul class="submenu">');

		group.items.forEach((item) => {
			const placemark = new ymaps.Placemark(item.center, {
				balloonContent: item.name,
			});

			collection.add(placemark);

			submenu
				.append(`<li><a href="#">${item.name}</a></li>`)
				.find("a:last")
				.click((e) => {
					e.preventDefault();
					placemark.balloon.open();
					myMap.panTo(item.center);
				});
		});

		menuGroup.append(submenu);
		menu.append(menuGroup);
	});

	menuToggle.click(() => menu.toggleClass("active"));
	menu.find(".close-btn").click(() => menu.removeClass("active"));
}
