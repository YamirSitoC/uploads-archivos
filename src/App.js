import React, { useState, useEffect } from 'react';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { getFirestore, collection, addDoc, deleteDoc, doc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { app } from './firebaseConfig';
import './App.css';  // Asegúrate de que este archivo contiene las directivas de Tailwind

function App() {
  const [archivoURL, setArchivoURL] = useState("");
  const [docus, setDocus] = useState([]);
  const [sortBy, setSortBy] = useState('fecha');
  const [sortOrder, setSortOrder] = useState('desc');
  const db = getFirestore(app);

  const archivoHandler = async (e) => {
    const archivo = e.target.files[0];
    const storage = getStorage(app);
    const storageRef = ref(storage, archivo.name);

    try {
      await uploadBytes(storageRef, archivo);
      const enlaceURL = await getDownloadURL(storageRef);
      setArchivoURL(enlaceURL);
      alert('Archivo cargado con éxito');
    } catch (error) {
      console.error("Error al cargar el archivo:", error);
      alert('Error al cargar el archivo');
    }
  };

  const submitHandler = async (e) => {
    e.preventDefault();
    const nombreArchivo = e.target.nombre.value;
    const tipoArchivo = e.target.tipo.value;

    if (!nombreArchivo || !tipoArchivo || !archivoURL) {
      alert('Por favor, completa todos los campos');
      return;
    }

    try {
      await addDoc(collection(db, "archivos"), {
        nombre: nombreArchivo,
        URL: archivoURL,
        tipo: tipoArchivo,
        fecha: new Date().toISOString(),
      });
      alert('Archivo guardado con éxito');
      e.target.reset();
      setArchivoURL("");
    } catch (error) {
      console.error("Error al guardar en Firestore:", error);
      alert('Error al guardar el archivo');
    }
  };

  const deleteFile = async (docId, fileName) => {
    const storage = getStorage(app);

    try {
      await deleteDoc(doc(db, "archivos", docId));
      const fileRef = ref(storage, fileName);
      await deleteObject(fileRef);
      alert('Archivo eliminado con éxito');
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

  const handleSort = (field) => {
    if (field === sortBy) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Gestor de Archivos</h1>
      
      <div className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
        <h2 className="text-xl font-semibold mb-4">Subir Nuevo Archivo</h2>
        <form onSubmit={submitHandler} className="space-y-4">
          <div>
            <input type="file" onChange={archivoHandler} className="w-full p-2 border rounded" />
          </div>
          <div>
            <input type="text" name="nombre" placeholder="Nombre del archivo" className="w-full p-2 border rounded" />
          </div>
          <div>
            <select name="tipo" className="w-full p-2 border rounded">
              <option value="">Selecciona el tipo de archivo</option>
              <option value="documento">Documento</option>
              <option value="imagen">Imagen</option>
              <option value="video">Video</option>
              <option value="audio">Audio</option>
            </select>
          </div>
          <button type="submit" className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
            Subir Archivo
          </button>
        </form>
      </div>

      <div className="flex justify-between mb-4">
        <button onClick={() => handleSort('fecha')} className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded">
          Ordenar por Fecha {sortBy === 'fecha' && (sortOrder === 'asc' ? '↑' : '↓')}
        </button>
        <button onClick={() => handleSort('tipo')} className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded">
          Ordenar por Tipo {sortBy === 'tipo' && (sortOrder === 'asc' ? '↑' : '↓')}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {docus.map((doc) => (
          <div key={doc.id} className="bg-white shadow-md rounded px-8 pt-6 pb-8">
            <h3 className="text-lg font-semibold mb-2">{doc.nombre}</h3>
            <p>Tipo: {doc.tipo}</p>
            <p>Fecha: {new Date(doc.fecha).toLocaleString()}</p>
            {doc.tipo === 'imagen' && (
              <img src={doc.URL} alt={doc.nombre} className="w-full h-40 object-cover mt-2" />
            )}
            <button 
              onClick={() => deleteFile(doc.id, doc.nombre)}
              className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded mt-4"
            >
              Eliminar
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;