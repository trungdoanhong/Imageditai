// Node management
let nodes = [];
let connections = [];
let nodeIdCounter = 0;
let isDragging = false;
let draggedNode = null;
let isConnecting = false;
let connectingFrom = null;
let tempLine = null;

const canvas = document.getElementById('canvas');
const svg = document.getElementById('connections');

// Node templates
const nodeTemplates = {
    'image-input': {
        icon: '🖼️',
        title: 'Image',
        description: '',
        color: '#4CAF50',
        hasInput: false,
        hasOutput: true,
        data: null
    },
    'image-processor': {
        icon: '🎨',
        title: 'AI',
        description: '',
        color: '#667eea',
        hasInput: true,
        hasOutput: true,
        inputImages: [],
        inputPrompt: '',
        result: null
    },
    'image-output': {
        icon: '📤',
        title: 'Output',
        description: '',
        color: '#FF9800',
        hasInput: true,
        hasOutput: true,
        data: null
    }
};

// Add a new node
function addNode(type) {
    const template = nodeTemplates[type];
    const node = {
        id: nodeIdCounter++,
        type: type,
        x: Math.random() * (canvas.offsetWidth - 200) + 50,
        y: Math.random() * (canvas.offsetHeight - 150) + 50,
        ...template
    };
    
    nodes.push(node);
    renderNode(node);
}

// Render a node
function renderNode(node) {
    const nodeEl = document.createElement('div');
    nodeEl.className = `node ${node.type}`;
    nodeEl.id = `node-${node.id}`;
    nodeEl.style.left = `${node.x}px`;
    nodeEl.style.top = `${node.y}px`;
    
    let portsHTML = '<div class="node-ports">';
    if (node.hasInput) {
        portsHTML += `<div class="port port-input" data-node-id="${node.id}" data-port-type="input"></div>`;
    } else {
        portsHTML += '<div></div>';
    }
    if (node.hasOutput) {
        portsHTML += `<div class="port port-output" data-node-id="${node.id}" data-port-type="output"></div>`;
    }
    portsHTML += '</div>';
    
    let additionalHTML = '';
    
    if (node.type === 'image-input') {
        additionalHTML = `
            <div class="node-image-preview" id="image-preview-${node.id}">
                <div class="image-placeholder">+</div>
            </div>
            <input type="file" id="image-input-${node.id}" accept="image/*" style="display: none;" onchange="handleImageUpload(${node.id}, this)">
            <button class="node-btn-small" onclick="document.getElementById('image-input-${node.id}').click()">📁</button>
        `;
    } else if (node.type === 'image-processor') {
        additionalHTML = `
            <textarea class="node-input" placeholder="Nhập prompt cho AI..." rows="3" oninput="updateProcessorPrompt(${node.id}, this.value)">${node.inputPrompt || ''}</textarea>
            <div class="node-status" id="processor-status-${node.id}">—</div>
            <button class="node-btn-small" id="processor-btn-${node.id}" onclick="processImageNode(${node.id})">▶ Chạy</button>
        `;
    } else if (node.type === 'image-output') {
        additionalHTML = `
            <div class="node-image-preview" id="output-preview-${node.id}">
                <div class="image-placeholder">—</div>
            </div>
            <button class="node-btn-small" id="download-btn-${node.id}" onclick="downloadResult(${node.id})" style="display: none;">💾</button>
        `;
    }
    
    nodeEl.innerHTML = `
        <div class="node-header">
            <span class="node-icon">${node.icon}</span>
            <span class="node-title">${node.title}</span>
        </div>
        ${additionalHTML}
        ${portsHTML}
    `;
    
    // Drag functionality
    nodeEl.addEventListener('mousedown', startDrag);
    nodeEl.addEventListener('dblclick', () => deleteNode(node.id));
    
    // Port connection functionality
    const ports = nodeEl.querySelectorAll('.port');
    ports.forEach(port => {
        port.addEventListener('mousedown', startConnection);
        port.addEventListener('mouseup', endConnection);
    });
    
    canvas.appendChild(nodeEl);
}

// Drag functionality
function startDrag(e) {
    if (e.target.classList.contains('port')) return;
    
    isDragging = true;
    draggedNode = e.currentTarget;
    draggedNode.classList.add('dragging');
    
    const rect = draggedNode.getBoundingClientRect();
    const canvasRect = canvas.getBoundingClientRect();
    
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;
    
    function onMouseMove(e) {
        if (!isDragging) return;
        
        const x = e.clientX - canvasRect.left - offsetX;
        const y = e.clientY - canvasRect.top - offsetY;
        
        draggedNode.style.left = `${x}px`;
        draggedNode.style.top = `${y}px`;
        
        // Update node position in data
        const nodeId = parseInt(draggedNode.id.split('-')[1]);
        const node = nodes.find(n => n.id === nodeId);
        if (node) {
            node.x = x;
            node.y = y;
        }
        
        updateConnections();
    }
    
    function onMouseUp() {
        if (isDragging && draggedNode) {
            draggedNode.classList.remove('dragging');
        }
        isDragging = false;
        draggedNode = null;
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
    }
    
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
}

// Connection functionality
function startConnection(e) {
    e.stopPropagation();
    
    const portType = e.target.dataset.portType;
    if (portType !== 'output') return; // Only start from output ports
    
    isConnecting = true;
    connectingFrom = {
        nodeId: parseInt(e.target.dataset.nodeId),
        port: portType
    };
    
    // Create temporary line
    tempLine = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    tempLine.classList.add('temp-connection');
    svg.appendChild(tempLine);
    
    const rect = e.target.getBoundingClientRect();
    const canvasRect = canvas.getBoundingClientRect();
    const startX = rect.left + rect.width / 2 - canvasRect.left;
    const startY = rect.top + rect.height / 2 - canvasRect.top;
    
    function onMouseMove(e) {
        if (!isConnecting) return;
        
        const x = e.clientX - canvasRect.left;
        const y = e.clientY - canvasRect.top;
        
        const path = createCurvedPath(startX, startY, x, y);
        tempLine.setAttribute('d', path);
    }
    
    document.addEventListener('mousemove', onMouseMove);
    
    const cleanup = () => {
        isConnecting = false;
        if (tempLine) {
            tempLine.remove();
            tempLine = null;
        }
        document.removeEventListener('mousemove', onMouseMove);
    };
    
    setTimeout(() => {
        document.addEventListener('mouseup', cleanup, { once: true });
    }, 0);
}

function endConnection(e) {
    if (!isConnecting) return;
    e.stopPropagation();
    
    const portType = e.target.dataset.portType;
    if (portType !== 'input') return; // Only end at input ports
    
    const toNodeId = parseInt(e.target.dataset.nodeId);
    const fromNodeId = connectingFrom.nodeId;
    
    // Check if connection already exists
    const exists = connections.some(
        conn => conn.from === fromNodeId && conn.to === toNodeId
    );
    
    if (!exists && fromNodeId !== toNodeId) {
        connections.push({
            from: fromNodeId,
            to: toNodeId
        });
        updateConnections();
        
        // Propagate data through connection
        const fromNode = nodes.find(n => n.id === fromNodeId);
        const toNode = nodes.find(n => n.id === toNodeId);
        
        if (fromNode && toNode) {
            if (fromNode.type === 'image-input' && fromNode.data) {
                propagateImageData(fromNodeId, fromNode.data);
            } else if (fromNode.type === 'image-processor' && fromNode.result) {
                if (toNode.type === 'image-output') {
                    toNode.data = fromNode.result;
                    updateOutputPreview(toNodeId, fromNode.result);
                }
            } else if (fromNode.type === 'image-output' && fromNode.data) {
                propagateImageData(fromNodeId, fromNode.data);
            }
        }
        
        // Update processor status if connected to processor
        if (toNode && toNode.type === 'image-processor') {
            updateProcessorStatus(toNodeId);
        }
    }
    
    isConnecting = false;
    connectingFrom = null;
}

// Create curved path for connections
function createCurvedPath(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const offset = Math.min(distance / 2, 100);
    
    return `M ${x1} ${y1} C ${x1 + offset} ${y1}, ${x2 - offset} ${y2}, ${x2} ${y2}`;
}

// Update all connections
function updateConnections() {
    // Clear existing connections
    const existingConnections = svg.querySelectorAll('.connection');
    existingConnections.forEach(conn => conn.remove());
    
    // Redraw connections
    connections.forEach((conn, index) => {
        const fromNode = nodes.find(n => n.id === conn.from);
        const toNode = nodes.find(n => n.id === conn.to);
        
        if (!fromNode || !toNode) return;
        
        const fromEl = document.getElementById(`node-${conn.from}`);
        const toEl = document.getElementById(`node-${conn.to}`);
        
        if (!fromEl || !toEl) return;
        
        const fromPort = fromEl.querySelector('.port-output');
        const toPort = toEl.querySelector('.port-input');
        
        if (!fromPort || !toPort) return;
        
        const canvasRect = canvas.getBoundingClientRect();
        const fromRect = fromPort.getBoundingClientRect();
        const toRect = toPort.getBoundingClientRect();
        
        const x1 = fromRect.left + fromRect.width / 2 - canvasRect.left;
        const y1 = fromRect.top + fromRect.height / 2 - canvasRect.top;
        const x2 = toRect.left + toRect.width / 2 - canvasRect.left;
        const y2 = toRect.top + toRect.height / 2 - canvasRect.top;
        
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.classList.add('connection');
        path.setAttribute('d', createCurvedPath(x1, y1, x2, y2));
        path.style.cursor = 'pointer';
        path.addEventListener('dblclick', () => deleteConnection(index));
        
        svg.appendChild(path);
    });
}

// Delete node
function deleteNode(nodeId) {
    // Remove node from array
    nodes = nodes.filter(n => n.id !== nodeId);
    
    // Remove node element
    const nodeEl = document.getElementById(`node-${nodeId}`);
    if (nodeEl) nodeEl.remove();
    
    // Remove connections
    connections = connections.filter(conn => conn.from !== nodeId && conn.to !== nodeId);
    updateConnections();
}

// Delete connection
function deleteConnection(index) {
    const conn = connections[index];
    if (conn) {
        // Update processor status if disconnecting from processor
        const toNode = nodes.find(n => n.id === conn.to);
        if (toNode && toNode.type === 'image-processor') {
            updateProcessorStatus(conn.to);
        }
    }
    
    connections.splice(index, 1);
    updateConnections();
}

// Clear canvas
function clearCanvas() {
    if (confirm('Bạn có chắc muốn xóa tất cả?')) {
        nodes = [];
        connections = [];
        canvas.innerHTML = '';
        svg.innerHTML = '';
    }
}

// Initialize with demo nodes
function initDemo() {
    // Check API status on load
    checkAPIStatus();
    fetchJobHistory();
    fetchAssetGallery();
    fetchJobHistory();
    
    // Clear any existing nodes
    nodes = [];
    connections = [];
    nodeIdCounter = 0;
    canvas.innerHTML = '';
    svg.innerHTML = '';

    const nodeSpacing = 180; // Spacing between nodes
    
    // Create 2 Image Input nodes (spaced vertically)
    const img1 = addNodeAt(100, 80, 'image-input');
    const img2 = addNodeAt(100, 80 + nodeSpacing, 'image-input');
    
    // Create AI Processor node (centered vertically between inputs)
    const processor = addNodeAt(400, 80 + nodeSpacing, 'image-processor');
    
    // Create Image Output node
    const output = addNodeAt(700, 80 + nodeSpacing, 'image-output');
    
    // Connect nodes
    setTimeout(() => {
        connections.push({ from: img1.id, to: processor.id });
        connections.push({ from: img2.id, to: processor.id });
        connections.push({ from: processor.id, to: output.id });
        updateConnections();
        updateProcessorStatus(processor.id);
    }, 100);
}

// Add node at specific position
function addNodeAt(x, y, type) {
    const template = nodeTemplates[type];
    const node = {
        id: nodeIdCounter++,
        type: type,
        x: x,
        y: y,
        ...template
    };
    
    nodes.push(node);
    renderNode(node);
    return node;
}

// Start
initDemo();

// Image Processing Functions

// Handle image upload
function handleImageUpload(nodeId, input) {
    const file = input.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
        const imageData = e.target.result;
        const node = nodes.find(n => n.id === nodeId);
        if (node) {
            node.data = imageData;
            updateImagePreview(nodeId, imageData);
            
            // Propagate to connected nodes
            propagateImageData(nodeId, imageData);
        }
    };
    reader.readAsDataURL(file);
}

// Update image preview
function updateImagePreview(nodeId, imageData) {
    const preview = document.getElementById(`image-preview-${nodeId}`);
    if (preview) {
        preview.innerHTML = `<img src="${imageData}" style="width: 100%; border-radius: 8px;">`;
    }
}

// Propagate image data to connected nodes
function propagateImageData(fromNodeId, imageData) {
    connections.forEach(conn => {
        if (conn.from === fromNodeId) {
            const toNode = nodes.find(n => n.id === conn.to);
            if (toNode && toNode.type === 'image-processor') {
                // Thêm ảnh vào array nếu chưa có
                if (!toNode.inputImages.includes(imageData)) {
                    toNode.inputImages.push(imageData);
                }
                updateProcessorStatus(conn.to);
            } else if (toNode && toNode.type === 'image-output') {
                toNode.data = imageData;
                updateOutputPreview(conn.to, imageData);
            }
        }
    });
}

// Collect all images from connected Image Input nodes
function collectInputImages(processorNodeId) {
    const processorNode = nodes.find(n => n.id === processorNodeId);
    if (!processorNode) return [];
    
    const inputImages = [];
    connections.forEach(conn => {
        if (conn.to === processorNodeId) {
            const fromNode = nodes.find(n => n.id === conn.from);
            if (!fromNode) return;
            const imageData =
                (fromNode.type === 'image-input' && fromNode.data) ? fromNode.data :
                (fromNode.type === 'image-output' && fromNode.data) ? fromNode.data :
                null;
            if (imageData && !inputImages.includes(imageData)) {
                inputImages.push(imageData);
            }
        }
    });
    
    return inputImages;
}

function updateProcessorPrompt(nodeId, promptText) {
    const node = nodes.find(n => n.id === nodeId);
    if (node && node.type === 'image-processor') {
        node.inputPrompt = promptText;
        updateProcessorStatus(nodeId);
    }
}

// Update processor status
function updateProcessorStatus(nodeId) {
    const statusEl = document.getElementById(`processor-status-${nodeId}`);
    if (!statusEl) return;
    
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    
    // Collect all input images
    const inputImages = collectInputImages(nodeId);
    node.inputImages = inputImages;
    
    const imageCount = inputImages.length;
    const hasPrompt = !!(node.inputPrompt && node.inputPrompt.trim());
    
    if (imageCount > 0 && hasPrompt) {
        statusEl.textContent = `✓ ${imageCount}`;
        statusEl.style.color = '#4CAF50';
    } else if (imageCount > 0) {
        statusEl.textContent = `⚠ ${imageCount}`;
        statusEl.style.color = '#FF9800';
    } else if (hasPrompt) {
        statusEl.textContent = '⚠';
        statusEl.style.color = '#FF9800';
    } else {
        statusEl.textContent = '—';
        statusEl.style.color = '#ccc';
    }
}

// Process image with AI
async function processImageNode(nodeId) {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    
    // Collect all input images
    const inputImages = collectInputImages(nodeId);
    node.inputImages = inputImages;
    
    const promptText = (node.inputPrompt || '').trim();
    if (inputImages.length === 0 || !promptText) {
        alert('Vui lòng kết nối ít nhất 1 Image Input và nhập prompt trước!');
        return;
    }
    
    const statusEl = document.getElementById(`processor-status-${nodeId}`);
    const runBtn = document.getElementById(`processor-btn-${nodeId}`);
    if (statusEl) {
        statusEl.textContent = 'Đang chạy...';
        statusEl.style.color = '#667eea';
    }
    if (runBtn) {
        runBtn.disabled = true;
        runBtn.textContent = '⟳ Đang chạy';
    }
    
    try {
        const response = await fetch('/api/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                prompt: promptText,
                images: inputImages // Gửi tất cả ảnh
            })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Có lỗi xảy ra');
        }
        
        if (data.images && data.images.length > 0) {
            node.result = data.images[0];
            
            // Propagate to output nodes
            connections.forEach(conn => {
                if (conn.from === nodeId) {
                    const toNode = nodes.find(n => n.id === conn.to);
                    if (toNode && toNode.type === 'image-output') {
                        toNode.data = data.images[0];
                        updateOutputPreview(conn.to, data.images[0]);
                    }
                }
            });
            
            if (statusEl) {
                statusEl.textContent = '✓';
                statusEl.style.color = '#4CAF50';
            }

            fetchJobHistory();
            fetchAssetGallery();
        } else {
            throw new Error('Không nhận được ảnh kết quả');
        }
        
    } catch (error) {
        console.error('Error processing image:', error);
        if (statusEl) {
            statusEl.textContent = '✗';
            statusEl.style.color = '#f44336';
        }
        alert(`Lỗi: ${error.message}\n\nHãy đảm bảo server đang chạy và API key hợp lệ.`);
        fetchJobHistory();
        fetchAssetGallery();
    } finally {
        if (runBtn) {
            runBtn.disabled = false;
            runBtn.textContent = '▶ Chạy';
        }
    }
}

// Update output preview
function updateOutputPreview(nodeId, imageData) {
    const preview = document.getElementById(`output-preview-${nodeId}`);
    const downloadBtn = document.getElementById(`download-btn-${nodeId}`);
    const node = nodes.find(n => n.id === nodeId);
    if (node) {
        node.data = imageData;
    }
    
    if (preview) {
        preview.innerHTML = `<img src="${imageData}" style="width: 100%; border-radius: 8px;">`;
    }
    
    if (downloadBtn) {
        downloadBtn.style.display = 'block';
    }

    propagateImageData(nodeId, imageData);
}

// Download result
function downloadResult(nodeId) {
    const node = nodes.find(n => n.id === nodeId);
    if (!node || !node.data) return;
    
    const link = document.createElement('a');
    link.href = node.data;
    link.download = `ai_edited_image_${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Check API status
async function checkAPIStatus() {
    const statusEl = document.getElementById('apiStatus');
    if (!statusEl) return;
    
    try {
        const response = await fetch('/api/health');
        const data = await response.json();
        
        if (data.api_key_set) {
            statusEl.innerHTML = '<span style="color: #4CAF50;">✅ API đã sẵn sàng</span>';
        } else {
            statusEl.innerHTML = '<span style="color: #f44336;">⚠️ API key chưa được cấu hình</span>';
        }
    } catch (error) {
        statusEl.innerHTML = '<span style="color: #f44336;">❌ Không kết nối được API. Đảm bảo server nội bộ đang chạy.</span>';
    }
}

// Job history helpers
async function refreshJobHistory() {
    await fetchJobHistory(true);
}

async function fetchJobHistory(showFeedback = false) {
    const historyContainer = document.getElementById('jobHistory');
    if (!historyContainer) return;
    
    try {
        const response = await fetch('/api/jobs?limit=20');
        if (!response.ok) {
            throw new Error('Không thể tải lịch sử xử lý');
        }
        const jobs = await response.json();
        renderJobHistory(jobs);
        if (showFeedback) {
            showStatus('🔁 Đã cập nhật lịch sử', 'info');
        }
    } catch (error) {
        console.error('History error:', error);
        historyContainer.innerHTML = `<p class="history-placeholder">${error.message}</p>`;
    }
}

function renderJobHistory(jobs) {
    const historyContainer = document.getElementById('jobHistory');
    if (!historyContainer) return;
    
    if (!jobs || jobs.length === 0) {
        historyContainer.innerHTML = '<p class="history-placeholder">Chưa có lần xử lý nào.</p>';
        return;
    }
    
    historyContainer.innerHTML = '';
    jobs.forEach(job => {
        const outputCount = (job.assets || []).filter(asset => asset.kind === 'output').length;
        const statusClass = job.status === 'completed' ? 'success' : job.status === 'error' ? 'error' : '';
        const statusLabel = job.status === 'completed' ? 'Hoàn tất' : job.status === 'error' ? 'Lỗi' : 'Đang xử lý';
        const item = document.createElement('div');
        item.className = `history-item ${statusClass}`;
        item.innerHTML = `
            <h3>#${job.id} · ${statusLabel}</h3>
            <p>${job.prompt || '—'}</p>
            ${job.error_message ? `<p class="history-error">${job.error_message}</p>` : ''}
            <div class="history-meta">
                <span>${formatDate(job.created_at)}</span>
                <span>${outputCount} ảnh</span>
            </div>
        `;
        historyContainer.appendChild(item);
    });
}

function formatDate(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString('vi-VN', {
        hour12: false,
    });
}

async function refreshAssetGallery() {
    await fetchAssetGallery(true);
}

async function fetchAssetGallery(showFeedback = false) {
    const gallery = document.getElementById('assetGallery');
    if (!gallery) return;

    try {
        const response = await fetch('/api/assets?kind=output&limit=24');
        if (!response.ok) {
            throw new Error('Không thể tải thư viện ảnh');
        }
        const assets = await response.json();
        renderAssetGallery(assets);
        if (showFeedback) {
            showStatus('🖼️ Đã cập nhật thư viện ảnh', 'info');
        }
    } catch (error) {
        console.error('Gallery error:', error);
        gallery.innerHTML = `<p class="history-placeholder">${error.message}</p>`;
    }
}

function renderAssetGallery(assets) {
    const gallery = document.getElementById('assetGallery');
    if (!gallery) return;

    if (!assets || assets.length === 0) {
        gallery.innerHTML = '<p class="history-placeholder">Chưa có ảnh nào.</p>';
        return;
    }

    gallery.innerHTML = '';
    assets.forEach(asset => {
        const item = document.createElement('div');
        item.className = 'gallery-item';

        const img = document.createElement('img');
        img.src = asset.file_url;
        img.alt = `Ảnh ${asset.id}`;
        item.appendChild(img);

        const meta = document.createElement('div');
        meta.className = 'gallery-meta';
        const label = document.createElement('span');
        label.textContent = `#${asset.id}`;
        meta.appendChild(label);

        const actions = document.createElement('div');
        actions.className = 'gallery-actions';

        const viewBtn = document.createElement('button');
        viewBtn.textContent = '👁️';
        viewBtn.title = 'Xem ảnh';
        viewBtn.onclick = () => openAssetPreview(asset.file_url);
        actions.appendChild(viewBtn);

        const downloadBtn = document.createElement('button');
        downloadBtn.textContent = '⬇️';
        downloadBtn.title = 'Tải ảnh';
        downloadBtn.onclick = () => downloadAsset(asset.file_url, asset.id);
        actions.appendChild(downloadBtn);

        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = '🗑️';
        deleteBtn.title = 'Xoá ảnh';
        deleteBtn.onclick = () => deleteAsset(asset.id);
        actions.appendChild(deleteBtn);

        meta.appendChild(actions);
        item.appendChild(meta);

        gallery.appendChild(item);
    });
}

function openAssetPreview(url) {
    window.open(url, '_blank');
}

function downloadAsset(url, id) {
    const link = document.createElement('a');
    link.href = url;
    link.download = `gallery_image_${id}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

async function deleteAsset(assetId) {
    if (!confirm('Xoá ảnh này khỏi thư viện?')) return;
    try {
        const response = await fetch(`/api/assets/${assetId}`, {
            method: 'DELETE'
        });
        if (!response.ok) {
            throw new Error('Không thể xoá ảnh');
        }
        showStatus('🗑️ Đã xoá ảnh', 'success');
        fetchAssetGallery();
        fetchJobHistory();
    } catch (error) {
        console.error('Delete asset error:', error);
        showStatus(`❌ ${error.message}`, 'error');
    }
}
