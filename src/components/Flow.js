const { ipcRenderer, shell } = require('electron');
const Sortable = require('sortablejs');
const { PDFDocument } = require('pdf-lib');
const fs = require('fs');

// Variáveis globais
let selectedFiles = [];
let defaultDirectory = '';

// -------------------------------
// Funções de Navegação e Exibição
// -------------------------------

function showSection(sectionId) {
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });
    document.getElementById(sectionId).classList.add('active');

    document.querySelectorAll('.sidebar button').forEach(button => {
        button.classList.remove('active');
    });
    document.querySelector(`[onclick="showSection('${sectionId}')"]`).classList.add('active');
}

// -------------------------------
// Funções de Carregamento e Criação de Tabela
// -------------------------------

async function loadPdfs() {
    pdfs = await ipcRenderer.invoke('GetPDF', defaultDirectory);
    createTable(pdfs);
}

function createTable(pdfs) {
    const pdfList = document.getElementById('pdfList');
    pdfList.innerHTML = '';
    pdfs.forEach(pdf => {
        const row = document.createElement('tr');

        // Coluna de seleção
        const selectCell = document.createElement('td');
        const label = document.createElement('label');
        label.style.display = 'flex';
        label.style.justifyContent = 'center';
        label.style.alignItems = 'center';
        label.style.width = '100%';
        label.style.height = '100%';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.style.margin = '0';
        checkbox.addEventListener('change', (e) => {
            if (e.target.checked) selectedFiles.push(pdf);
            else selectedFiles = selectedFiles.filter(file => file.path !== pdf.path);
        });
        label.appendChild(checkbox);
        selectCell.appendChild(label);
        row.appendChild(selectCell);

        // Colunas de nome, data, tamanho e visualização
        row.appendChild(createTableCell(pdf.name));
        row.appendChild(createTableCell(new Date(pdf.mtime).toLocaleString()));
        row.appendChild(createTableCell(formatSize(pdf.size)));

        // Botão de visualização
        const viewButton = document.createElement('button');
        viewButton.textContent = '️👁‍🗨';
        viewButton.addEventListener('click', () => ipcRenderer.send('viewpdf', pdf.path));
        viewButton.style.display = 'flex';
        viewButton.style.justifyContent = 'center';
        viewButton.style.alignItems = 'center';


        const viewCell = document.createElement('td');
        viewCell.style.display = 'flex';
        viewCell.style.justifyContent = 'center';
        viewCell.style.alignItems = 'center';
        viewCell.appendChild(viewButton);
        row.appendChild(viewCell);

        pdfList.appendChild(row);
    });
}

function createTableCell(content) {
    const cell = document.createElement('td');
    cell.textContent = content;
    return cell;
}


// -------------------------------
// Funções de Ordenação e Formatação
// -------------------------------

function sortPdfsByDate(order) {
    pdfs.sort((a, b) => {
        const dateA = new Date(a.mtime);
        const dateB = new Date(b.mtime);
        return order === 'asc' ? dateA - dateB : dateB - dateA;
    });
    createTable(pdfs);
}

function formatSize(sizeInBytes) {
    return (sizeInBytes / (1024 * 1024)).toFixed(2) + ' MB';
}


// -------------------------------
// Eventos de Botões e Interação com o Usuário
// -------------------------------

document.getElementById('selectFolderButton').addEventListener('click', async () => {
    const folderPath = await ipcRenderer.invoke('SelectFolder');
    if (folderPath) {
        defaultDirectory = folderPath;
        document.getElementById('defaultDirectory').textContent = defaultDirectory;
        loadPdfs();
    }
});

document.getElementById('saveSettingsButton').addEventListener('click', async () => {
    alert('Configurações salvas.');
    loadPdfs();
});



document.getElementById('mergeButton').addEventListener('click', () => {
    if (selectedFiles.length < 2) {
        alert('Por favor, selecione pelo menos dois PDFs para mesclar.');
        return;
    }

    const sortableList = document.getElementById('sortableList');
    sortableList.innerHTML = '';
    
    selectedFiles.forEach((file, index) => {
        const li = document.createElement('li');
        li.dataset.index = index;
    
        const indexSpan = document.createElement('div');
        indexSpan.classList.add('index');
        indexSpan.textContent = index + 1;
    
        const totalFiles = selectedFiles.length;
        const position = (index + 1) / totalFiles;
    
        if (position <= 0.30) {
            indexSpan.classList.add('green');
        } else if (position <= 0.53) {
            indexSpan.classList.add('teal');
        } else if (position <= 0.80) {
            indexSpan.classList.add('yellow');
        } else {
            indexSpan.classList.add('red');
        }
    
        li.innerHTML = `
            <span>${file.name}</span>
            <button class="view-button" data-index="${index}">️️👁️</button>
            <button class="remove-button" data-index="${index}">❌</button>
        `;
        li.insertBefore(indexSpan, li.firstChild);
        sortableList.appendChild(li);
    });
    
    new Sortable(sortableList, {
        animation: 150,
        onStart: evt => {
            evt.item.classList.add('grabbing');
        },
        onEnd: evt => {
            evt.item.classList.remove('grabbing');
            const movedItem = selectedFiles.splice(evt.oldIndex, 1)[0];
            selectedFiles.splice(evt.newIndex, 0, movedItem);
    
            // Atualizar a ordem dos itens
            updateListOrder();
        }
    });
    
    function updateListOrder() {
        const listItems = sortableList.querySelectorAll('li');
        listItems.forEach((item, index) => {
            const indexSpan = item.querySelector('.index');
            indexSpan.textContent = index + 1;
    
            // Resetar classes de cor
            const totalFiles = selectedFiles.length;
            const position = (index + 1) / totalFiles;
    
            indexSpan.className = 'index';
            if (position <= 0.25) {
                indexSpan.classList.add('green');
            } else if (position <= 0.5) {
                indexSpan.classList.add('teal');
            } else if (position <= 0.75) {
                indexSpan.classList.add('yellow');
            } else {
                indexSpan.classList.add('red');
            }
        });
    }
    ;



    document.getElementById('mergeModal').style.display = 'block';

    document.querySelectorAll('.view-button').forEach(button => { 
        button.addEventListener('click', (e) => { 
            const index = e.target.dataset.index; 
            const filePath = selectedFiles[index].path; 
            ipcRenderer.send('viewpdf', filePath); 
        }); 
    });

    document.querySelectorAll('.remove-button').forEach(button => {
        button.addEventListener('click', event => {
            event.target.parentElement.remove();
        });
    });
    
});

document.getElementById('closeModalButton').addEventListener('click', () => {
    document.getElementById('mergeModal').style.display = 'none';
});

// -------------------------------
// Funções de Mesclagem de PDFs
// -------------------------------

document.getElementById('confirmMergeButton').addEventListener('click', async () => {
    document.getElementById('mergeModal').style.display = 'none';

    const mergedPdf = await PDFDocument.create();
    const listItems = document.querySelectorAll('#sortableList li');

    for (const listItem of listItems) {
        const index = listItem.querySelector('.remove-button').getAttribute('data-index');
        const file = selectedFiles[index];
        const arrayBuffer = fs.readFileSync(file.path).buffer;
        const pdf = await PDFDocument.load(arrayBuffer);
        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        copiedPages.forEach(page => mergedPdf.addPage(page));
    }

    const savePath = await ipcRenderer.invoke('SaveModal', defaultDirectory);
    if (savePath) {
        try {
            const mergedPdfBytes = await mergedPdf.save();
            fs.writeFileSync(savePath, mergedPdfBytes);
            alert(`PDFs mesclados com sucesso! Arquivo salvo em ${savePath}`);
            selectedFiles = [];
            loadPdfs();
        } catch (error) {
            console.error('Erro ao salvar o PDF mesclado:', error);
            alert('Erro ao salvar o PDF mesclado. Verifique o console para mais detalhes.');
        }
    } else {
        alert('Salvamento cancelado.');
    }
});

// -------------------------------
// Inicialização da Aplicação
// -------------------------------

ipcRenderer.invoke('GetdefaultDiretory').then(directory => {
    defaultDirectory = directory;
    document.getElementById('defaultDirectory').textContent = defaultDirectory;
    loadPdfs();
});

const table = document.getElementById('pdfTable');
const dateHeader = table.querySelector('th:nth-child(3)');
let order = 'asc';
dateHeader.addEventListener('click', () => {
    order = order === 'asc' ? 'desc' : 'asc';
    sortPdfsByDate(order);
});
