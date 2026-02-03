const supabaseClient = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);

let products = [];
let cart = JSON.parse(localStorage.getItem('boutiqueCart')) || [];
let modalInstance;
let offcanvasCart;

document.addEventListener('DOMContentLoaded', () => {
    modalInstance = new bootstrap.Modal(document.getElementById('productModal'));
    offcanvasCart = new bootstrap.Offcanvas(document.getElementById('cartOffcanvas'));
    
    fetchProducts();
    updateCartUI();

    document.getElementById('searchInput').addEventListener('keyup', (e) => {
        filterCatalog('search', null, e.target.value.toLowerCase());
    });
});

async function fetchProducts() {
    const { data } = await supabaseClient.from('products').select('*');
    if (data) {
        products = data;
        renderRandomFeatured();
        filterCatalog('all', document.querySelector('.active-filter'));
    }
}

// FUNCIONALIDAD BOTÓN SUBIR
function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showView(viewName, navElement) {
    const home = document.getElementById('home-view');
    const catalog = document.getElementById('catalog-view');
    
    if (viewName === 'home') {
        home.classList.remove('d-none');
        catalog.classList.add('d-none');
    } else {
        home.classList.add('d-none');
        catalog.classList.remove('d-none');
    }
    
    scrollToTop();

    // Actualizar menú activo
    if (navElement) {
        document.querySelectorAll('.nav-link').forEach(el => el.classList.remove('active'));
        navElement.classList.add('active');
        const navbar = document.getElementById('navbarContent');
        if (navbar.classList.contains('show')) {
            new bootstrap.Collapse(navbar).hide();
        }
    }
}

function renderRandomFeatured() {
    const container = document.getElementById('randomFeatured');
    const shuffled = [...products].sort(() => 0.5 - Math.random()).slice(0, 3);
    container.innerHTML = '';
    shuffled.forEach(prod => container.innerHTML += createProductCard(prod));
}

function filterCatalog(criteria, btnElement, searchTerm = '') {
    const grid = document.getElementById('catalogGrid');
    grid.innerHTML = '';

    if (btnElement) {
        document.querySelectorAll('#filterContainer button').forEach(b => {
            b.classList.remove('active-filter', 'btn-dark');
            b.classList.add('btn-outline-dark');
        });
        btnElement.classList.remove('btn-outline-dark');
        btnElement.classList.add('btn-dark', 'active-filter');
    }

    let filtered = products;
    if (criteria === 'search') filtered = products.filter(p => p.title.toLowerCase().includes(searchTerm));
    else if (criteria !== 'all') filtered = products.filter(p => p.category === criteria);

    if(filtered.length === 0) grid.innerHTML = '<div class="col-12 text-center py-5 text-muted">No encontramos resultados.</div>';
    else filtered.forEach(prod => grid.innerHTML += createProductCard(prod));
}

function createProductCard(prod) {
    return `
        <div class="col-lg-4 col-md-6 mb-4">
            <div class="product-card shadow-sm rounded-0" onclick="openModal(${prod.id})">
                <img src="${prod.image}" alt="${prod.title}">
                <div class="card-overlay">
                    <h5 class="text-white font-playfair mb-0">${prod.title}</h5>
                    <p class="text-gold fw-bold mb-0">$${prod.price.toFixed(2)}</p>
                </div>
            </div>
        </div>
    `;
}

function openModal(id) {
    const prod = products.find(p => p.id === id);
    if (!prod) return;

    document.getElementById('modalTitle').innerText = prod.title;
    document.getElementById('modalCategory').innerText = prod.category || 'Colección';
    document.getElementById('modalDesc').innerText = prod.desc || 'Sin descripción.';
    document.getElementById('modalPrice').innerText = `$${prod.price.toFixed(2)}`;
    
    const mainImg = document.getElementById('modalImg');
    mainImg.src = prod.image;

    mainImg.style.cursor = "zoom-in"; // Pone el cursor de lupa
    mainImg.onclick = () => {
        const zoomModal = new bootstrap.Modal(document.getElementById('zoomModal'));
        document.getElementById('zoomImgDisplay').src = mainImg.src; // Pasa la foto actual al zoom
        zoomModal.show();
    };

    const galleryContainer = document.getElementById('modalGallery');
    galleryContainer.innerHTML = '';
    
    let images = [prod.image];
    if (prod.gallery) images = images.concat(prod.gallery);

    if (images.length > 1) {
        images.forEach((src, idx) => {
            const thumb = document.createElement('img');
            thumb.src = src;
            thumb.className = `gallery-thumb ${idx === 0 ? 'active' : ''}`;
            thumb.onclick = () => {
                mainImg.src = src;
                document.querySelectorAll('.gallery-thumb').forEach(t => t.classList.remove('active'));
                thumb.classList.add('active');
            };
            galleryContainer.appendChild(thumb);
        });
    }

    document.getElementById('modalAddBtn').onclick = () => {
        addToCart(prod);
        modalInstance.hide();
        showCustomAlert(prod.title);
    };

    modalInstance.show();
}

// CARRITO
function addToCart(prod) {
    const existing = cart.find(i => i.id === prod.id);
    if (existing) existing.qty++; else cart.push({ ...prod, qty: 1 });
    updateCartUI();
}

function updateCartQty(index, delta) {
    if (cart[index].qty + delta > 0) cart[index].qty += delta; else cart.splice(index, 1);
    updateCartUI();
}

function removeCartItem(index) {
    cart.splice(index, 1);
    updateCartUI();
}

function updateCartUI() {
    const container = document.getElementById('cartItemsContainer');
    container.innerHTML = '';
    let total = 0, count = 0;

    cart.forEach((item, index) => {
        total += item.price * item.qty;
        count += item.qty;
        container.innerHTML += `
            <div class="d-flex align-items-center bg-white p-3 mb-2 rounded shadow-sm border-bottom">
                <img src="${item.image}" style="width:60px; height:60px; object-fit:cover; border-radius:5px;" class="me-3">
                <div class="flex-grow-1">
                    <h6 class="font-playfair mb-0 small fw-bold">${item.title}</h6>
                    <small class="text-gold fw-bold">$${item.price.toFixed(2)}</small>
                </div>
                <div class="d-flex align-items-center gap-2">
                    <button class="btn btn-sm btn-light border" onclick="updateCartQty(${index}, -1)">-</button>
                    <span class="small fw-bold px-2">${item.qty}</span>
                    <button class="btn btn-sm btn-light border" onclick="updateCartQty(${index}, 1)">+</button>
                    <button class="btn btn-sm text-danger ms-2" onclick="removeCartItem(${index})"><i class="fas fa-trash"></i></button>
                </div>
            </div>`;
    });

    document.getElementById('cartTotal').innerText = `$${total.toFixed(2)}`;
    document.getElementById('cartCountBadge').innerText = count;
    localStorage.setItem('boutiqueCart', JSON.stringify(cart));
}

function checkoutWhatsApp() {
    const msg = cart.map(i => `▪ ${i.qty}x ${i.title}`).join('\n');
    const url = `https://wa.me/593979078720?text=${encodeURIComponent("Hola, quisiera finalizar este pedido:\n\n" + msg + "\n\nTotal: " + document.getElementById('cartTotal').innerText)}`;
    window.open(url, '_blank');
}

function toggleCart() { offcanvasCart.show(); }
function showCustomAlert(name) {
    document.getElementById('alertMessage').innerText = `¡${name} se ha añadido al carrito!`;
    document.getElementById('customAlert').classList.remove('d-none');
}
function closeCustomAlert() { document.getElementById('customAlert').classList.add('d-none'); }