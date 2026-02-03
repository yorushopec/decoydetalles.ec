// --- CONFIGURACIÓN SUPABASE ---
const supabaseClient = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);

// --- LOGIN ---
function checkLogin() {
    const pass = document.getElementById('adminPass').value;
    if(pass === "admin123") { 
        document.getElementById('login-overlay').classList.add('d-none');
        document.getElementById('admin-panel').classList.remove('d-none');
        loadAdminProducts(); 
    } else {
        document.getElementById('errorMsg').classList.remove('d-none');
    }
}

// --- SUBIDA MULTI-IMAGEN ---
document.getElementById('uploadForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const btn = document.getElementById('submitBtn');
    const originalText = btn.innerText;
    btn.disabled = true;
    btn.innerText = "SUBIENDO IMÁGENES...";

    try {
        const title = document.getElementById('pTitle').value;
        const category = document.getElementById('pCategory').value;
        const price = parseFloat(document.getElementById('pPrice').value);
        const desc = document.getElementById('pDesc').value;
        
        // Obtenemos TODOS los archivos seleccionados
        const fileInput = document.getElementById('pImage');
        const files = fileInput.files;

        if (files.length === 0) throw new Error("Selecciona al menos una imagen");

        // Array para guardar las URLs de todas las fotos
        let uploadedUrls = [];

        // Bucle: Subimos una por una
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const fileName = `${Date.now()}_${i}_${file.name.replace(/\s/g, '')}`;
            
            // Subir al Bucket 'images'
            const { error: uploadError } = await supabaseClient
                .storage
                .from('images')
                .upload(fileName, file);

            if (uploadError) throw uploadError;

            // Obtener URL
            const { data: publicUrlData } = supabaseClient
                .storage
                .from('images')
                .getPublicUrl(fileName);
            
            uploadedUrls.push(publicUrlData.publicUrl);
        }

        // Lógica: 
        // La primera foto (índice 0) va al campo 'image' (Portada).
        // El resto (índice 1 en adelante) van al campo 'gallery'.
        const mainImage = uploadedUrls[0];
        const galleryImages = uploadedUrls.slice(1); // Del 1 al final

        // Guardar en Base de Datos
        const { error: dbError } = await supabaseClient
            .from('products')
            .insert([
                { 
                    title, 
                    category, 
                    price, 
                    desc, 
                    image: mainImage, 
                    gallery: galleryImages // Aquí guardamos el array de extras
                }
            ]);

        if (dbError) throw dbError;

        alert("¡Producto y galería guardados con éxito!");
        document.getElementById('uploadForm').reset();
        loadAdminProducts(); 

    } catch (error) {
        console.error(error);
        alert("Error: " + error.message);
    } finally {
        btn.disabled = false;
        btn.innerText = originalText;
    }
});

// --- LISTAR PRODUCTOS ---
async function loadAdminProducts() {
    const list = document.getElementById('productsList');
    list.innerHTML = '<div class="text-center py-3"><i class="fas fa-spinner fa-spin"></i></div>';

    const { data, error } = await supabaseClient.from('products').select('*').order('id', { ascending: false });

    if (error) { list.innerHTML = `<p class="text-danger">${error.message}</p>`; return; }
    
    list.innerHTML = '';
    if (data.length === 0) { list.innerHTML = '<p class="text-muted text-center">Sin productos.</p>'; return; }

    data.forEach(prod => {
        // Calculamos cuántas fotos extra tiene para mostrar el dato
        const galleryCount = prod.gallery ? prod.gallery.length : 0;
        
        list.innerHTML += `
            <div class="product-mini-item">
                <div class="d-flex align-items-center">
                    <img src="${prod.image}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px;" class="me-3">
                    <div>
                        <h6 class="m-0 fw-bold small">${prod.title}</h6>
                        <small class="text-muted">$${prod.price} | +${galleryCount} fotos extra</small>
                    </div>
                </div>
                <button class="btn btn-sm btn-outline-danger border-0" onclick="deleteProduct(${prod.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
    });
}

async function deleteProduct(id) {
    if(!confirm("¿Borrar producto permanentemente?")) return;
    const { error } = await supabaseClient.from('products').delete().eq('id', id);
    if (error) alert(error.message);
    else loadAdminProducts();
}