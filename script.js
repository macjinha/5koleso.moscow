document.addEventListener('DOMContentLoaded', () => {
    setupAccordion();
    setupPanelGallery();
    setupPricing();
    setupPromo();
});

function setupAccordion() {
    const buttons = Array.from(document.querySelectorAll('.accordion-btn'));
    if (!buttons.length) {
        return;
    }

    buttons.forEach((button, index) => {
        const content = button.nextElementSibling;
        if (!content) {
            return;
        }

        const isDefaultOpen = index === 0;
        button.setAttribute('aria-expanded', String(isDefaultOpen));
        button.classList.toggle('active', isDefaultOpen);
        toggleAccordionContent(content, isDefaultOpen);

        button.addEventListener('click', () => {
            const isExpanded = button.getAttribute('aria-expanded') === 'true';
            button.setAttribute('aria-expanded', String(!isExpanded));
            button.classList.toggle('active', !isExpanded);
            toggleAccordionContent(content, !isExpanded);
        });
    });
}

function toggleAccordionContent(content, shouldOpen) {
    if (shouldOpen) {
        content.classList.add('is-open');
        const height = `${content.scrollHeight}px`;
        content.style.maxHeight = height;
        content.style.opacity = '1';
        content.addEventListener(
            'transitionend',
            () => {
                content.style.maxHeight = 'none';
            },
            { once: true }
        );
    } else {
        content.style.maxHeight = `${content.scrollHeight}px`;
        requestAnimationFrame(() => {
            content.style.maxHeight = '0';
            content.style.opacity = '0';
            content.addEventListener(
                'transitionend',
                () => {
                    content.classList.remove('is-open');
                    content.style.maxHeight = '';
                },
                { once: true }
            );
        });
    }
}

function setupPanelGallery() {
    const panels = Array.from(document.querySelectorAll('.panel'));
    if (!panels.length) {
        return;
    }

    function activatePanel(selected) {
        panels.forEach((panel) => {
            panel.classList.toggle('active', panel === selected);
        });
    }

    panels.forEach((panel) => {
        panel.tabIndex = 0;
        panel.addEventListener('click', () => activatePanel(panel));
        panel.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                activatePanel(panel);
            }
        });
    });
}

function setupPricing() {
    const tabs = Array.from(document.querySelectorAll('.pricing-tab'));
    if (!tabs.length) {
        return;
    }

    const sliders = {
        sedan: document.querySelector('.sedan-slider'),
        suv: document.querySelector('.suv-slider'),
        gaz: document.querySelector('.gaz-slider')
    };

    const currentDiameter = {
        sedan: Number(sliders.sedan?.value ?? 16),
        suv: Number(sliders.suv?.value ?? 18),
        gaz: Number(sliders.gaz?.value ?? 19)
    };

    let pricingData = null;
    const renderedKey = new Map();

    fetch('prices.json')
        .then((response) => response.json())
        .then((data) => {
            pricingData = data;
            activateTab('sedan');
        })
        .catch((error) => {
            console.error('Не удалось загрузить прайс-лист', error);
        });

    tabs.forEach((tab) => {
        tab.addEventListener('click', () => {
            if (!pricingData) {
                return;
            }
            const type = tab.dataset.tab;
            activateTab(type);
        });
    });

    Object.entries(sliders).forEach(([type, slider]) => {
        if (!slider) {
            return;
        }
        slider.addEventListener('input', (event) => {
            if (!pricingData) {
                return;
            }

            const value = Number(event.target.value);
            currentDiameter[type] = value;
            updateDiameterLabel(slider, value);
            renderTable(type, value);
        });
    });

    function activateTab(type) {
        tabs.forEach((tab) => {
            const isActive = tab.dataset.tab === type;
            tab.classList.toggle('active', isActive);
            tab.setAttribute('aria-selected', String(isActive));
        });

        const panels = document.querySelectorAll('.tab-content');
        panels.forEach((panel) => {
            panel.classList.toggle('active', panel.classList.contains(type));
        });

        syncSlider(type);
        renderTable(type, currentDiameter[type]);
    }

    function syncSlider(type) {
        const slider = sliders[type];
        if (!slider || !pricingData?.[type]) {
            return;
        }

        const diameters = Object.keys(pricingData[type])
            .map(Number)
            .sort((a, b) => a - b);

        if (!diameters.length) {
            return;
        }

        slider.min = String(diameters[0]);
        slider.max = String(diameters[diameters.length - 1]);

        if (!diameters.includes(currentDiameter[type])) {
            currentDiameter[type] = diameters[0];
        }

        slider.value = String(currentDiameter[type]);
        updateDiameterLabel(slider, currentDiameter[type]);
    }

    function renderTable(type, diameter) {
        const data = pricingData?.[type];
        if (!data) {
            return;
        }

        const diameters = Object.keys(data).map(Number).sort((a, b) => a - b);
        if (!diameters.includes(diameter)) {
            const nearest = findNearestDiameter(diameters, diameter);
            currentDiameter[type] = nearest;
            const slider = sliders[type];
            if (slider) {
                slider.value = String(nearest);
                updateDiameterLabel(slider, nearest);
            }
        }

        const actualDiameter = currentDiameter[type];
        const content = data[actualDiameter];
        const table = document.querySelector(`.${type}-slider`)?.closest('.tab-content')?.querySelector('.price-table');
        if (!table || !content) {
            return;
        }

        const key = `${type}-${actualDiameter}`;
        if (renderedKey.get(type) === key) {
            return;
        }

        renderedKey.set(type, key);

        const thead = table.querySelector('thead');
        const tbody = table.querySelector('tbody');
        if (!thead || !tbody) {
            return;
        }

        thead.innerHTML = `<tr>${(pricingData.columns ?? ['Услуга', 'Цена']).map((column) => `<th>${column}</th>`).join('')}</tr>`;

        tbody.style.opacity = '0';
        requestAnimationFrame(() => {
            tbody.innerHTML = content.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join('')}</tr>`).join('');
            requestAnimationFrame(() => {
                tbody.style.opacity = '1';
            });
        });
    }

    function updateDiameterLabel(slider, value) {
        const label = slider.closest('.diameter-selector')?.querySelector('.diameter-value');
        if (label) {
            label.textContent = String(value);
        }
    }
}

function findNearestDiameter(diameters, target) {
    return diameters.reduce((nearest, current) => {
        if (Math.abs(current - target) < Math.abs(nearest - target)) {
            return current;
        }
        return nearest;
    }, diameters[0]);
}

function setupPromo() {
    const popup = document.getElementById('promoPopup');
    const closeBtn = document.getElementById('closePromoBtn');
    const promoButton = document.getElementById('promoButton');

    if (!popup || !closeBtn || !promoButton) {
        return;
    }

    const openPopup = () => {
        popup.classList.remove('hidden');
        promoButton.setAttribute('aria-expanded', 'true');
        promoButton.classList.add('hidden');
    };

    const closePopup = () => {
        popup.classList.add('hidden');
        promoButton.setAttribute('aria-expanded', 'false');
        promoButton.classList.remove('hidden');
        promoButton.focus();
    };

    setTimeout(openPopup, 600);

    closeBtn.addEventListener('click', closePopup);
    promoButton.addEventListener('click', openPopup);

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && !popup.classList.contains('hidden')) {
            closePopup();
        }
    });
}
