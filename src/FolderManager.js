import React, { useState, useEffect } from 'react';
import { getFirestore, collection, addDoc, query, where, onSnapshot, updateDoc, doc } from 'firebase/firestore';

function FolderManager({ files, onFileMove, onFolderSelect, currentFolder, onUploadToFolder }) {
  const [folders, setFolders] = useState([]);
  const [newFolderName, setNewFolderName] = useState('');
  const [breadcrumbs, setBreadcrumbs] = useState([{ id: null, name: 'Raíz' }]);
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [selectedFileToMove, setSelectedFileToMove] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  
  const db = getFirestore();

  useEffect(() => {
    const q = query(
      collection(db, "folders"),
      where("parentId", "==", currentFolder || null)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const folderList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setFolders(folderList);
    });

    return () => unsubscribe();
  }, [currentFolder]);

  const createFolder = async (e) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    try {
      await addDoc(collection(db, "folders"), {
        name: newFolderName,
        parentId: currentFolder || null,
        createdAt: new Date().toISOString()
      });
      setNewFolderName('');
    } catch (error) {
      console.error("Error al crear la carpeta:", error);
      alert('Error al crear la carpeta');
    }
  };

  const handleDragStart = (e, file) => {
    e.dataTransfer.setData('fileId', file.id);
    setSelectedFileToMove(file);
  };

  const handleDragOver = (e, folderId) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDrop = async (e, folderId) => {
    e.preventDefault();
    setIsDragging(false);
    const fileId = e.dataTransfer.getData('fileId');
    
    if (fileId) {
      try {
        await updateDoc(doc(db, "archivos", fileId), {
          folderId: folderId
        });
        onFileMove(fileId, folderId);
      } catch (error) {
        console.error("Error al mover el archivo:", error);
        alert('Error al mover el archivo');
      }
    }
  };

  const navigateToBreadcrumb = (breadcrumb, index) => {
    onFolderSelect(breadcrumb.id);
    setBreadcrumbs(prev => prev.slice(0, index + 1));
  };

  return (
    <div className="mb-8">
      <div className="bg-white rounded-xl shadow-lg p-6 mb-4">
        {/* Breadcrumbs */}
        <div className="flex items-center space-x-2 mb-4 overflow-x-auto">
          {breadcrumbs.map((breadcrumb, index) => (
            <React.Fragment key={breadcrumb.id || 'root'}>
              {index > 0 && <span className="text-gray-400">/</span>}
              <button
                onClick={() => navigateToBreadcrumb(breadcrumb, index)}
                className="text-indigo-600 hover:text-indigo-800 font-medium"
              >
                {breadcrumb.name}
              </button>
            </React.Fragment>
          ))}
        </div>

        {/* Crear nueva carpeta */}
        <form onSubmit={createFolder} className="flex space-x-2 mb-6">
          <input
            type="text"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            placeholder="Nombre de la nueva carpeta"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            type="submit"
            className="bg-indigo-600 text-white px-6 py-2 rounded-full hover:bg-indigo-700 transition duration-300"
          >
            Crear Carpeta
          </button>
        </form>

        {/* Grid de carpetas y archivos */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {/* Carpetas */}
          {folders.map((folder) => (
            <div
              key={folder.id}
              onDragOver={(e) => handleDragOver(e, folder.id)}
              onDrop={(e) => handleDrop(e, folder.id)}
              className={`cursor-pointer p-4 border-2 rounded-lg transition duration-300 ${
                isDragging ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:bg-gray-50'
              }`}
            >
              <div 
                className="flex items-center justify-between"
                onClick={() => {
                  onFolderSelect(folder.id);
                  setBreadcrumbs(prev => [...prev, { id: folder.id, name: folder.name }]);
                }}
              >
                <div className="flex items-center space-x-2">
                  <span className="text-2xl">📁</span>
                  <span className="font-medium truncate">{folder.name}</span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onUploadToFolder(folder.id);
                  }}
                  className="text-indigo-600 hover:text-indigo-800 text-sm"
                >
                  Subir aquí
                </button>
              </div>
            </div>
          ))}

          {/* Archivos */}
          {files.map((file) => (
            <div
              key={file.id}
              draggable
              onDragStart={(e) => handleDragStart(e, file)}
              className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition duration-300"
            >
              <div className="flex items-center space-x-2">
                <span className="text-2xl">
                  {file.tipo === 'imagen' ? '🖼️' : 
                   file.tipo === 'video' ? '🎥' : 
                   file.tipo === 'audio' ? '🎵' : '📄'}
                </span>
                <span className="font-medium truncate">{file.nombre}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default FolderManager;