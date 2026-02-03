async function hashPassword(string) {
    const utf8 = new TextEncoder().encode(string);
    const hashBuffer = await crypto.subtle.digest('SHA-256', utf8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(bytes => bytes.toString(16).padStart(2, '0')).join('');
}

document.addEventListener('DOMContentLoaded', () => {

    if (typeof supabase === 'undefined' || typeof CONFIG === 'undefined') {
        alert("Error crítico: No se cargaron las librerías. Revisa tu internet o el archivo config.js");
        return;
    }

    const supabaseClient = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);

    const loginBtn = document.querySelector('#login-overlay button');
    if (loginBtn) {
        loginBtn.onclick = async () => {
            const passInput = document.getElementById('adminPass');
            const pass = passInput.value;
            const userHash = await hashPassword(pass);
            const REAL_HASH = "240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9";

            if (userHash === REAL_HASH) {
                document.getElementById('login-overlay').classList.add('d-none');
                document.getElementById('admin-panel').classList.remove('d-none');
                loadAdminProducts(supabaseClient);
            } else {
                document.getElementById('errorMsg').classList.remove('d-none');
                passInput.value = ''; 
            }
        };
    }

    const uploadForm = document.getElementById('uploadForm');
    if (uploadForm) {
        uploadForm.addEventListener('submit', async (e) => {
            e.preventDefault(); 

            const btn = document.getElementById('submitBtn');
            const originalText = btn.innerText;
            btn.disabled = true;
            btn.innerText = "SUBIENDO PRODUCTO...";

            try {
                const title = document.getElementById('pTitle').value;
                const category = document.getElementById('pCategory').value;
                const price = parseFloat(document.getElementById('pPrice').value);
                const desc = document.getElementById('pDesc').value;
                const files = document.getElementById('pImage').files;

                if (files.length === 0) throw new Error("¡Falta la foto!");

                let uploadedUrls = [];

                // Subimos las fotos
                for (let i = 0; i < files.length; i++) {
                    const file = files[i];
                    const cleanName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
                    const fileName = `${Date.now()}_${i}_${cleanName}`;

                    const { error: uploadError } = await supabaseClient.storage
                        .from('images')
                        .upload(fileName, file);

                    if (uploadError) throw uploadError;

                    const { data } = supabaseClient.storage
                        .from('images')
                        .getPublicUrl(fileName);
                    
                    uploadedUrls.push(data.publicUrl);
                }

                // Guardamos en base de datos
                const { error: dbError } = await supabaseClient
                    .from('products')
                    .insert([{
                        title, category, price, desc,
                        image: uploadedUrls[0], // Primera foto es portada
                        gallery: uploadedUrls.slice(1) // El resto a la galería
                    }]);

                if (dbError) throw dbError;

                alert("¡Producto guardado!");
                uploadForm.reset();
                loadAdminProducts(supabaseClient);

            } catch (error) {
                console.error(error);
                alert("Error: " + error.message);
            } finally {
                btn.disabled = false;
                btn.innerText = originalText;
            }
        });
    }
});

// Función para cargar productos
async function loadAdminProducts(client) {
    const list = document.getElementById('productsList');
    list.innerHTML = 'Cargando...';
    
    const { data, error } = await client.from('products').select('*').order('id', { ascending: false });

    if (error) { list.innerHTML = 'Error al cargar lista.'; return; }
    list.innerHTML = '';

    data.forEach(prod => {
        const item = document.createElement('div');
        item.className = 'product-mini-item';
        item.innerHTML = `
            <div class="d-flex align-items-center">
                <img src="${prod.image}" style="width: 40px; height: 40px; object-fit: cover; border-radius: 4px;" class="me-2">
                <small class="fw-bold">${prod.title}</small>
            </div>
            <button class="btn btn-sm text-danger delete-btn"><i class="fas fa-trash"></i></button>
        `;
        item.querySelector('.delete-btn').onclick = async () => {
            if(confirm('¿Borrar?')) {
                await client.from('products').delete().eq('id', prod.id);
                loadAdminProducts(client);
            }
        };
        list.appendChild(item);
    });
}