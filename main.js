const API_POSTS = "http://localhost:3000/posts";
const API_COMMENTS = "http://localhost:3000/comments";
const API_PRODUCTS = "https://api.escuelajs.co/api/v1/products";

async function api(url, method = "GET", data = null) {
  const options = {
    method,
    headers: { "Content-Type": "application/json" }
  };
  if (data) options.body = JSON.stringify(data);
  const res = await fetch(url, options);
  return res.json();
}

// ================= POSTS =================

async function loadPosts() {
  const posts = await api(API_POSTS);
  const body = document.getElementById("post-body");
  body.innerHTML = posts.map(postToHTML).join("");
}

function postToHTML(post) {
  const style = post.isDeleted ? "text-decoration: line-through;" : "";
  return `
    <tr style="${style}">
      <td>${post.id}</td>
      <td>${post.title}</td>
      <td>${post.views}</td>
      <td>
        <button onclick="softDeletePost('${post.id}')">Delete</button>
      </td>
    </tr>
  `;
}

async function savePost() {
  let id = document.getElementById("id_txt").value;
  let title = document.getElementById("title_txt").value;
  let views = document.getElementById("views_txt").value;

  const posts = await api(API_POSTS);

  if (!id) {
    const maxId = Math.max(0, ...posts.map(p => parseInt(p.id)));
    id = (maxId + 1).toString();
  }

  const post = { id, title, views, isDeleted: false };
  const exists = posts.find(p => p.id === id);

  if (exists) {
    await api(API_POSTS + "/" + id, "PUT", post);
  } else {
    await api(API_POSTS, "POST", post);
  }

  loadPosts();
}

async function softDeletePost(id) {
  const post = await api(API_POSTS + "/" + id);
  post.isDeleted = true;
  await api(API_POSTS + "/" + id, "PUT", post);
  loadPosts();
}

// ================= COMMENTS =================

async function loadComments() {
  const comments = await api(API_COMMENTS);
  const body = document.getElementById("comment-body");
  body.innerHTML = comments.map(commentToHTML).join("");
}

function commentToHTML(comment) {
  const style = comment.isDeleted ? "text-decoration: line-through;" : "";
  return `
    <tr style="${style}">
      <td>${comment.id}</td>
      <td>${comment.text}</td>
      <td>${comment.postId}</td>
      <td>
        <button onclick="softDeleteComment('${comment.id}')">Delete</button>
      </td>
    </tr>
  `;
}

async function saveComment() {
  let id = document.getElementById("comment_id_txt").value;
  let text = document.getElementById("comment_text_txt").value;
  let postId = document.getElementById("comment_postId_txt").value;

  const comments = await api(API_COMMENTS);

  if (!id) {
    const maxId = Math.max(0, ...comments.map(c => parseInt(c.id)));
    id = (maxId + 1).toString();
  }

  const comment = { id, text, postId, isDeleted: false };
  const exists = comments.find(c => c.id === id);

  if (exists) {
    await api(API_COMMENTS + "/" + id, "PUT", comment);
  } else {
    await api(API_COMMENTS, "POST", comment);
  }

  loadComments();
}

async function softDeleteComment(id) {
  const comment = await api(API_COMMENTS + "/" + id);
  comment.isDeleted = true;
  await api(API_COMMENTS + "/" + id, "PUT", comment);
  loadComments();
}

// ================= PRODUCTS =================

// Global state for products
let allProducts = [];
let filteredProducts = [];
let currentPage = 1;
let itemsPerPage = 10;
let currentSort = { field: null, order: null };

// Fetch and display all products
async function getAllProducts() {
  try {
    const response = await fetch(API_PRODUCTS);
    if (!response.ok) {
      throw new Error(`Failed to fetch products: ${response.status}`);
    }
    allProducts = await response.json();
    filteredProducts = [...allProducts];
    applyFiltersAndRender();
  } catch (error) {
    console.error("Error fetching products:", error);
    document.getElementById("product-body").innerHTML = 
      `<tr><td colspan="5" style="text-align: center; color: red;">Lỗi khi tải dữ liệu: ${error.message}</td></tr>`;
  }
}

// Render products in the table
function renderProducts(products) {
  const tbody = document.getElementById("product-body");
  
  if (products.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center;">Không có sản phẩm nào</td></tr>`;
    return;
  }

  // Calculate pagination
  const start = (currentPage - 1) * itemsPerPage;
  const end = start + itemsPerPage;
  const paginatedProducts = products.slice(start, end);

  tbody.innerHTML = paginatedProducts.map((product, index) => {
    // Display all images - hiển thị TẤT CẢ ảnh của sản phẩm
    let imagesHTML = '';
    if (product.images && product.images.length > 0) {
      imagesHTML = product.images.map((img, imgIndex) => 
        `<img src="${img}" alt="${product.title} - Ảnh ${imgIndex + 1}" class="product-image" onerror="this.style.display='none'">`
      ).join("");
      // Thêm số lượng ảnh
      imagesHTML += `<span class="image-count">(${product.images.length} ảnh)</span>`;
    } else {
      imagesHTML = '<span>Không có hình ảnh</span>';
    }

    const rowClass = index % 2 === 0 ? 'even' : 'odd';
    return `
      <tr class="product-row ${rowClass}">
        <td>${product.id}</td>
        <td>${product.title}</td>
        <td>$${product.price}</td>
        <td>${product.category ? product.category.name : 'N/A'}</td>
        <td>
          <div class="product-images">${imagesHTML}</div>
        </td>
      </tr>
    `;
  }).join("");

  // Update page info
  const totalPages = Math.ceil(products.length / itemsPerPage);
  document.getElementById("page-info").textContent = `Trang ${currentPage} / ${totalPages || 1}`;
}

// Search products by title (onChange)
function handleProductSearch(event) {
  const query = event.target.value.toLowerCase().trim();
  
  if (query === "") {
    filteredProducts = [...allProducts];
  } else {
    filteredProducts = allProducts.filter(product => 
      product.title.toLowerCase().includes(query)
    );
  }
  
  currentPage = 1; // Reset to first page when searching
  applyFiltersAndRender();
}

// Change items per page
function handleItemsPerPageChange(value) {
  itemsPerPage = value;
  currentPage = 1; // Reset to first page
  applyFiltersAndRender();
}

// Pagination functions
function goToPreviousPage() {
  if (currentPage > 1) {
    currentPage--;
    applyFiltersAndRender();
  }
}

function goToNextPage() {
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  if (currentPage < totalPages) {
    currentPage++;
    applyFiltersAndRender();
  }
}

// Sorting functions
function sortProductsByPrice(order) {
  currentSort = { field: 'price', order };
  applyFiltersAndRender();
}

function sortProductsByTitle(order) {
  currentSort = { field: 'title', order };
  applyFiltersAndRender();
}

// Apply all filters, sorting and render
function applyFiltersAndRender() {
  let productsToRender = [...filteredProducts];

  // Apply sorting
  if (currentSort.field) {
    productsToRender.sort((a, b) => {
      let aValue = a[currentSort.field];
      let bValue = b[currentSort.field];

      // Handle string comparison for title
      if (currentSort.field === 'title') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (currentSort.order === 'asc') {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      } else {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
      }
    });
  }

  renderProducts(productsToRender);
}

// ================= INIT =================
loadPosts();
loadComments();
getAllProducts();
