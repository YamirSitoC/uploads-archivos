import React, { useState, useEffect } from 'react';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

import { getFirestore, collection, addDoc, deleteDoc, doc, onSnapshot, query, orderBy, where, updateDoc } from 'firebase/firestore';

import { app } from './firebaseConfig';

import RedirectPage from './RedirectPage';

import './animations.css';

import './index.css';
import './App.css';

import FolderManager from './FolderManager';


function App() {
  const [archivoURL, setArchivoURL] = useState("");
  const [archivoPreview, setArchivoPreview] = useState(null);
  const [docus, setDocus] = useState([]);
  const [sortBy, setSortBy] = useState('fecha');
  const [sortOrder, setSortOrder] = useState('desc');
  
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState(null);
  const db = getFirestore(app);

  const [showRedirect, setShowRedirect] = useState(true);
  const [redirectTime, setRedirectTime] = useState(15);


  const [currentFolder, setCurrentFolder] = useState(null);
  const [uploadToFolderId, setUploadToFolderId] = useState(null);


  /*const migrateOldDocuments = async () => {
    const querySnapshot = await getDocs(collection(db, "archivos"));
    
    querySnapshot.forEach(async (doc) => {
      const data = doc.data();
      if (!data.storagePath && data.URL) {
        // Extraer el storagePath de la URL
        const url = new URL(data.URL);
        const storagePath = decodeURIComponent(url.pathname.split('/o/')[1].split('?')[0]);
        
        // Actualizar el documento
        await updateDoc(doc.ref, {
          storagePath: storagePath
        });
      }
    });
  };*/

  const archivoHandler = async (e) => {
    const archivo = e.target.files[0];
    if (archivo) {
      setSelectedFile(archivo);
      setArchivoPreview(URL.createObjectURL(archivo));
      const storage = getStorage(app);
      const storageRef = ref(storage, archivo.name);
  
      setIsUploading(true);
      setUploadProgress(0);
  
      try {
        await uploadBytes(storageRef, archivo);
        const enlaceURL = await getDownloadURL(storageRef);
        setArchivoURL(enlaceURL);
        setIsUploading(false);
        setUploadProgress(100);
      } catch (error) {
        console.error("Error al cargar el archivo:", error);
        setIsUploading(false);
        alert('Error al cargar el archivo');
      }
    }
  };

  const submitHandler = async (e) => {
    e.preventDefault();
    const nombreArchivo = e.target.nombre.value;
    const tipoArchivo = e.target.tipo.value;
  
    if (!nombreArchivo || !tipoArchivo || !selectedFile) {
      alert('Por favor, completa todos los campos y selecciona un archivo');
      return;
    }
  
    try {
      setIsUploading(true);
      setUploadProgress(0);
  
      const storage = getStorage(app);
      const storagePath = `archivos/${Date.now()}_${selectedFile.name}`;
      const storageRef = ref(storage, storagePath);
  
      await uploadBytes(storageRef, selectedFile);
      setUploadProgress(100);
      const downloadURL = await getDownloadURL(storageRef);
  
      await addDoc(collection(db, "archivos"), {
        nombre: nombreArchivo,
        storagePath: storagePath,
        URL: downloadURL,
        tipo: tipoArchivo,
        fecha: new Date().toISOString(),
        folderId: uploadToFolderId || currentFolder // Usa el ID de carpeta específico o la carpeta actual
      });
  
      setIsUploading(false);
      setSelectedFile(null);
      setArchivoPreview(null);
      setUploadToFolderId(null);
      e.target.reset();
      alert('Archivo subido con éxito');
    } catch (error) {
      console.error("Error al guardar en Firestore:", error);
      setIsUploading(false);
      alert('Error al guardar el archivo: ' + error.message);
    }
  };

  const handleFileMove = async (fileId, newFolderId) => {
    try {
      await updateDoc(doc(db, "archivos", fileId), {
        folderId: newFolderId
      });
    } catch (error) {
      console.error("Error al mover el archivo:", error);
      alert('Error al mover el archivo');
    }
  };
  


  const deleteFile = async (docId, fileName) => {
    const storage = getStorage(app);

    try {
      await deleteDoc(doc(db, "archivos", docId));
      const fileRef = ref(storage, fileName);
      await deleteObject(fileRef);
    } catch (error) {
      console.error("Error al eliminar el archivo:", error);
      alert('Error al eliminar el archivo');
    }
  };

  useEffect(() => {
    const q = query(collection(db, "archivos"), orderBy(sortBy, sortOrder));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const updatedDocs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setDocus(updatedDocs);
    });

    return () => unsubscribe();
  }, [sortBy, sortOrder]);

  
  useEffect(() => {
    if (showRedirect) {
      const timer = setInterval(() => {
        setRedirectTime((prevTime) => {
          if (prevTime <= 1) {
            clearInterval(timer);
            setShowRedirect(false);
            return 0;
          }
          return prevTime - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [showRedirect]);


  useEffect(() => {
    const q = query(
      collection(db, "archivos"),
      where("folderId", "==", currentFolder),
      orderBy(sortBy, sortOrder)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const updatedDocs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setDocus(updatedDocs);
    });

    return () => unsubscribe();
  }, [sortBy, sortOrder, currentFolder]);


  const skipRedirect = () => {
    setShowRedirect(true);
  }


  const handleSort = (field) => {
    if (field === sortBy) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const handleDownload = async (doc) => {
    try {
      const storage = getStorage(app);
      let downloadURL;
  
      if (doc.storagePath) {
        const cleanPath = doc.storagePath.startsWith('/') ? doc.storagePath.slice(1) : doc.storagePath;
        const fileRef = ref(storage, cleanPath);
        downloadURL = await getDownloadURL(fileRef);
      } else if (doc.URL) {
        downloadURL = doc.URL;
      } else {
        throw new Error('No se encontró ruta de almacenamiento ni URL para el archivo');
      }
  
      // Usar fetch para obtener el archivo como un blob
      const response = await fetch(downloadURL);
      const blob = await response.blob();
  
      // Crear un objeto URL para el blob
      const blobUrl = window.URL.createObjectURL(blob);
  
      // Crear un enlace temporal y forzar la descarga
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = doc.nombre || 'archivo_descargado';
      document.body.appendChild(link);
      link.click();
  
      // Limpiar
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
  
    } catch (error) {
      console.error("Error al descargar el archivo:", error);
      alert(`Error al descargar el archivo: ${error.message}`);
    }
  };

  const renderPreview = (file) => {
    if (!file) return null;

    const previewStyle = "w-full h-48 object-cover rounded-lg shadow-md";

    if (file.tipo === 'imagen' || (archivoPreview && file.URL.startsWith('blob:'))) {
      return <img src={file.URL || archivoPreview} alt={file.nombre} className={previewStyle} />;
    } else if (file.tipo === 'video') {
      return (
        <video controls className={previewStyle}>
          <source src={file.URL || archivoPreview} type="video/mp4" />
          Tu navegador no soporta el elemento de video.
        </video>
      );
    } else if (file.tipo === 'audio') {
      return (
        <div className={`${previewStyle} flex items-center justify-center bg-gray-100`}>
          <audio controls className="w-full">
            <source src={file.URL || archivoPreview} type="audio/mpeg" />
            Tu navegador no soporta el elemento de audio.
          </audio>
        </div>
      );
    } else {
      return (
        <div className={`${previewStyle} flex items-center justify-center bg-gray-100`}>
          <span className="text-4xl">📄</span>
        </div>
      );
    }
  };

  if (showRedirect){
    return (
      <div>
        <RedirectPage />
        <div className="fixed bottom-4 right-4 flex flex-col items-end">
          <p className="text-white bg-indigo-600 px-4 py-2 rounded-full mb-2">
            Redirigiendo en {redirectTime} segundos...
          </p>
          <button
            onClick={skipRedirect}
            className="bg-white text-indigo-600 font-bold py-2 px-4 rounded-full hover:bg-indigo-100 transition duration-300"
          >
            Saltar espera
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-5xl font-extrabold text-indigo-900 text-center mb-12 tracking-tight">
          Computo en la nube
        </h1>
        
        <FolderManager 
          files={docus}
          onFileMove={handleFileMove}
          onFolderSelect={setCurrentFolder}
          currentFolder={currentFolder}
          onUploadToFolder={(folderId) => setUploadToFolderId(folderId)}
        />


        <div className="bg-white shadow-2xl rounded-2xl px-8 pt-6 pb-8 mb-12 transition-all duration-300 hover:shadow-3xl">
          <h2 className="text-3xl font-bold text-indigo-800 mb-6">Subir Nuevo Archivo</h2>
          <form onSubmit={submitHandler} className="space-y-6">
            <div>
              <label htmlFor="file-upload" className="block text-sm font-medium text-gray-700 mb-2">
                Seleccionar archivo
              </label>
              <input
                id="file-upload"
                type="file"
                onChange={archivoHandler}
                className="w-full px-3 py-2 border border-gray-300 rounded-full shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-300"
              />
            </div>
            <div>
              <label htmlFor="file-name" className="block text-sm font-medium text-gray-700 mb-2">
                Nombre del archivo
              </label>
              <input
                id="file-name"
                type="text"
                name="nombre"
                placeholder="Nombre del archivo"
                className="w-full px-3 py-2 border border-gray-300 rounded-full shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-300"
              />
            </div>
            <div>
              <label htmlFor="file-type" className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de archivo
              </label>
              <select
                id="file-type"
                name="tipo"
                className="w-full px-3 py-2 border border-gray-300 rounded-full shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-300"
              >
                <option value="">Selecciona el tipo de archivo</option>
                <option value="documento">Documento</option>
                <option value="imagen">Imagen</option>
                <option value="video">Video</option>
                <option value="audio">Audio</option>
              </select>
            </div>
            {archivoPreview && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Vista Previa:</h3>
                {renderPreview({ URL: archivoPreview, tipo: document.querySelector('select[name="tipo"]').value })}
              </div>
            )}
            {isUploading && (
              <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700 mt-4">
                <div 
                  className="bg-indigo-600 h-2.5 rounded-full transition-all duration-500 ease-out" 
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            )}
            <button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-full transition duration-300 ease-in-out transform hover:-translate-y-1 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Subir Archivo
            </button>
          </form>
        </div>

        <div className="flex justify-between mb-8">
          <button
            onClick={() => handleSort('fecha')}
            className="bg-white text-indigo-600 font-semibold py-2 px-6 border-2 border-indigo-600 rounded-full hover:bg-indigo-100 transition duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Ordenar por Fecha {sortBy === 'fecha' && (sortOrder === 'asc' ? '↑' : '↓')}
          </button>
          <button
            onClick={() => handleSort('tipo')}
            className="bg-white text-indigo-600 font-semibold py-2 px-6 border-2 border-indigo-600 rounded-full hover:bg-indigo-100 transition duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Ordenar por Tipo {sortBy === 'tipo' && (sortOrder === 'asc' ? '↑' : '↓')}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {docus.map((doc) => (
            <div key={doc.id} className="bg-white rounded-xl shadow-xl overflow-hidden transition duration-300 ease-in-out transform hover:-translate-y-1 hover:scale-105">
              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-800 mb-2 truncate">{doc.nombre}</h3>
                <p className="text-sm text-gray-600 mb-1">Tipo: {doc.tipo}</p>
                <p className="text-sm text-gray-600 mb-4">Fecha: {new Date(doc.fecha).toLocaleString()}</p>
                {renderPreview(doc)}
              </div>
              <div className="px-6 py-4 bg-gray-50 flex justify-between">
                <button 
                  onClick={() => deleteFile(doc.id, doc.nombre)}
                  className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-6 rounded-full transition duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  Eliminar
                </button>
                <button 
                    onClick={() => handleDownload(doc)}
                    className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-6 rounded-full transition duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  Descargar
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default App;