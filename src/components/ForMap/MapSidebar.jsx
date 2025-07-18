// components/ForMap/MapSidebar.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import './MapSidebar.css'; // This CSS file is already used for component styling

console.log("MapSidebar.jsx loaded and running!");

export default function MapSidebar({
  polygons,
  selectedPolygon, 
  setSelectedPolygon, 
  deletePolygon,
  handleEditPolygon, 
  clearAllCrops,
  updatePolygonCrop,
  calculateArea,
  formatArea,
  startDrawing,
  stopDrawing,
  handleStopAndSaveEdit,
  isDrawing,
  isEditingMode,
  clearAll,
  handleLogout,
  showMyPolygons,
  updatePolygonName,
  updatePolygonComment,
  updatePolygonColor,
  isSavingPolygon,
  isFetchingPolygons,
  showCropsSection,
  savePolygonToDatabase,
  BASE_API_URL,
  userRole, // Current user role
  allUsers, // List of all users (for admin panel)
  selectedUserForAdminView, // Selected user for admin view
  handleUserSelectForAdminView, // User selection function
  onUpdateSelectedUserEmail, // Function to update user email
  showToast, // showToast added
  isAnalysisLoading, // Make sure this prop is passed if used
  currentAuthenticatedUser, // Current authenticated user data
  flyToPolygon // NEW: Prop for flying to polygon
}) {
  const [activeSection, setActiveSection] = useState('map');
  const [showPolygonsList, setShowPolygonsList] = useState(true);

  const [chapters, setChapters] = useState([]);
  const [selectedChapter, setSelectedChapter] = useState('');
  const [cropsByChapter, setCropsByChapter] = useState([]);
  const [selectedCrop, setSelectedCrop] = useState('');
  const [varietiesByCrop, setVarietiesByCrop] = useState([]);
  const [selectedVariety, setSelectedVariety] = useState('');
  const [loadingCropData, setLoadingCropData] = useState(false);
  const [cropDataError, setCropDataError] = useState(null);

  // ✨ NEW STATE: for new email input
  const [newEmailForUser, setNewEmailForUser] = useState('');

  const navigate = useNavigate();
  const location = useLocation();

  // State for sidebar width
  const [sidebarWidth, setSidebarWidth] = useState(280); // Initial width
  const sidebarRef = useRef(null);
  const isResizing = useRef(false);
  

  useEffect(() => {
    if (location.pathname === '/') setActiveSection('home');
    else if (location.pathname === '/dashboard') setActiveSection('map');
    else if (location.pathname === '/chat') setActiveSection('ai-chat');
    else if (location.pathname === '/earthdata') setActiveSection('soil-data');
    else setActiveSection('');
  }, [location.pathname]);

  const fetchApiData = useCallback(async (url, setter, errorMessage) => {
    setLoadingCropData(true);
    setCropDataError(null);
    const token = localStorage.getItem('token');
    if (!token) {
      setCropDataError('Error: Authentication token is missing. Please log in.');
      setLoadingCropData(false);
      return;
    }
    try {
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Loading error: ${response.status} - ${errorText}`);
      }
      const data = await response.json();

      if (Array.isArray(data)) {
        if (url.includes('/chapters')) {
          setter(data.filter(item => typeof item === 'string'));
        } else if (url.includes('/by-chapter')) {
          setter(data.filter(item => item && typeof item.name === 'string'));
        } else if (url.includes('/by-crop')) {
          setter(data.filter(item => item && typeof item.name === 'string').map(variety => variety.name));
        } else {
          setter(data);
        }
      } else {
        setCropDataError(`Incorrect data format from server for ${url}.`);
        setter([]);
      }
    } catch (error) {
      console.error(errorMessage, error);
      setCropDataError(errorMessage + `: ${error.message}`);
      setter([]);
    } finally {
      setLoadingCropData(false);
    }
  }, []);

  useEffect(() => {
    fetchApiData(`${BASE_API_URL}/api/v1/crops/chapters`, setChapters, 'Failed to load crop chapters');
  }, [fetchApiData, BASE_API_URL]);

  useEffect(() => {
    if (selectedChapter) {
      fetchApiData(`${BASE_API_URL}/api/v1/crops/by-chapter?chapter=${encodeURIComponent(selectedChapter)}`, setCropsByChapter, 'Failed to load crops for selected chapter');
      setSelectedCrop('');
      setVarietiesByCrop([]);
      setSelectedVariety('');
    } else {
      setCropsByChapter([]);
      setSelectedCrop('');
      setVarietiesByCrop([]);
      setSelectedVariety('');
    }
  }, [selectedChapter, fetchApiData, BASE_API_URL]);

  useEffect(() => {
    if (selectedCrop) {
      fetchApiData(`${BASE_API_URL}/api/v1/crops/by-crop?crop=${encodeURIComponent(selectedCrop)}`, setVarietiesByCrop, 'Failed to load varieties for selected crop');
      setSelectedVariety('');
    } else {
      setVarietiesByCrop([]);
      setSelectedVariety('');
    }
  }, [selectedCrop, fetchApiData, BASE_API_URL]);

  const handleUpdatePolygonCrop = useCallback((polygonId, chapter, crop, variety) => {
    const parts = [];
    if (chapter) {
        parts.push(chapter);
    }
    if (crop) {
        parts.push(crop);
    }
    if (variety) {
        parts.push(variety);
    }
    const fullCropName = parts.join(',');
    const currentPolygonInProps = polygons.find(p => p.id === polygonId);

    if (currentPolygonInProps && currentPolygonInProps.crop !== fullCropName) {
        updatePolygonCrop(polygonId, fullCropName);
    }
}, [polygons, updatePolygonCrop]); 

  useEffect(() => {
    if (selectedPolygon && selectedPolygon.id && !loadingCropData && chapters.length > 0) { 
      const polygon = polygons.find(p => p.id === selectedPolygon.id); 
      if (polygon && polygon.crop) {
        const parts = polygon.crop.split(',');
        const chapterFromPolygon = parts[0] || '';
        const cropFromPolygon = parts[1] || '';
        const varietyFromPolygon = parts[2] || '';

        if (chapters.includes(chapterFromPolygon)) {
            setSelectedChapter(chapterFromPolygon);
        } else {
            setSelectedChapter('');
        }

        if (cropFromPolygon && cropsByChapter.some(c => c.name === cropFromPolygon)) {
            setSelectedCrop(cropFromPolygon);
        } else {
            setSelectedCrop('');
        }

        if (varietyFromPolygon && varietiesByCrop.includes(varietyFromPolygon)) {
            setSelectedVariety(varietyFromPolygon);
        } else {
            setSelectedVariety('');
        }

      } else {
        setSelectedChapter('');
        setSelectedCrop('');
        setSelectedVariety('');
      }
    } else if (!selectedPolygon) { 
      setSelectedChapter('');
      setSelectedCrop('');
      setSelectedVariety('');
    }
  }, [selectedPolygon, polygons, chapters, cropsByChapter, varietiesByCrop, loadingCropData]); 

  // Resizing functions
  const handleMouseMove = useCallback((e) => {
    if (!isResizing.current || !sidebarRef.current) return;

    const newWidth = document.documentElement.clientWidth - e.clientX;
    const minWidth = 200;
    const maxWidth = 600; 

    const clampedWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
    
    requestAnimationFrame(() => {
        if (sidebarRef.current) {
            sidebarRef.current.style.width = `${clampedWidth}px`;
        }
    });
  }, []); 

  const handleMouseUp = useCallback(() => {
    if (isResizing.current && sidebarRef.current) {
      const finalWidth = parseInt(sidebarRef.current.style.width, 10);
      setSidebarWidth(finalWidth);
    }

    isResizing.current = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    document.body.classList.remove('no-select');
    document.body.style.cursor = '';
  }, [handleMouseMove, setSidebarWidth]); 

  const handleMouseDown = useCallback((e) => {
    e.preventDefault(); 
    isResizing.current = true;
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    document.body.classList.add('no-select');
    document.body.style.cursor = 'ew-resize';
  }, [handleMouseMove, handleMouseUp]); 

  const onSelectAnalysisForPolygon = useCallback((polygon, analysisType) => {
    console.log(`Requesting ${analysisType} analysis for polygon ID: ${polygon.id}`);
    if (selectedPolygon && selectedPolygon.id === polygon.id) {
      // Logic to trigger analysis based on selected polygon and type
      // This is usually handled by the parent component that manages MapComponent
    } else {
      setSelectedPolygon(polygon); // First select the polygon
      // Then trigger analysis
    }
    showToast(`Loading ${analysisType} analysis...`, 'info');
  }, [selectedPolygon, showToast, setSelectedPolygon]); // Added setSelectedPolygon to deps

  // Mock data for crops if not provided
  const cropsOptions = [
    { value: 'Cereals', label: 'Cereals' },
    { value: 'Corn', label: 'Corn' },
    { value: 'Sunflower', label: 'Sunflower' },
    { value: 'Potatoes', label: 'Potatoes' },
    { value: 'Vegetables', label: 'Vegetables' },
    { value: 'Garden crops', label: 'Garden crops' },
    { value: 'Other', label: 'Other' },
  ];

  const handleClearSelectedPolygon = useCallback(() => {
    setSelectedPolygon(null);
    if (isEditingMode) {
      handleStopAndSaveEdit();
    }
  }, [setSelectedPolygon, isEditingMode, handleStopAndSaveEdit]);

  // Add a fallback for onUpdateSelectedUserEmail if no function is provided
  const actualOnUpdateSelectedUserEmail = onUpdateSelectedUserEmail || (() => console.log('onUpdateSelectedUserEmail is not provided'));

  // Helper function to determine if a polygon can be edited
  const canEditPolygon = useCallback((polygon) => {
    console.log(`Checking canEditPolygon for polygon ID: ${polygon?.id || 'N/A'}`);
    console.log("  Polygon ownerId:", polygon?.ownerId);
    console.log("  Current userRole:", userRole);
    console.log("  Selected user for admin view:", selectedUserForAdminView);
    console.log("  Current authenticated user ID:", currentAuthenticatedUser?.id); // Log for debugging

    if (!polygon) {
      console.log("  Result: false (no polygon passed to canEditPolygon)");
      return false;
    }
    if (!userRole) {
      console.log("  Result: false (no userRole)");
      return false;
    }

    // ✨ NEW: DEMO user can edit their "own" (local) polygons
    if (userRole === 'DEMO') {
      console.log("  Result: true (DEMO user can edit their local polygons)");
      return true;
    }

    if (userRole === 'SUPER_ADMIN') {
      console.log("  Result: true (SUPER_ADMIN can edit all)");
      return true;
    }
    if (userRole === 'ADMIN') {
      // If ADMIN has selected a specific user (USER), and the polygon belongs to that USER
      if (selectedUserForAdminView && selectedUserForAdminView.role === 'USER') {
        const isSelectedUserOwner = (polygon.ownerId === selectedUserForAdminView.id);
        console.log(`  ADMIN with selected USER. Is selected USER the owner? ${isSelectedUserOwner}`);
        if (isSelectedUserOwner) {
          return true;
        } else {
          console.log("  ADMIN with selected USER, but polygon is not owned by selected USER.");
          return false;
        }
      } 
      // If ADMIN has not selected a user (viewing their own polygons)
      // and the polygon belongs to the current ADMIN
      else if (!selectedUserForAdminView && polygon.ownerId === currentAuthenticatedUser?.id) {
        console.log("  ADMIN viewing their own polygons. Result: true (allowing edit)");
        return true;
      }
      else {
        console.log("  ADMIN: Cannot edit. Either no user selected and polygon not owned by ADMIN, or selected user is not a USER.");
        return false;
      }
    }
    // Regular USER can only edit their own polygons
    if (userRole === 'USER' && polygon.ownerId === currentAuthenticatedUser?.id) {
      console.log("  Result: true (USER editing their own polygon)");
      return true;
    }
    console.log("  Result: false (default case or insufficient permissions)");
    return false; // By default, if role does not match or insufficient permissions
  }, [userRole, selectedUserForAdminView, currentAuthenticatedUser]); // Added currentAuthenticatedUser to deps


  return (
    <div className={`map-sidebar-container`} ref={sidebarRef} style={{ width: `${sidebarWidth}px` }}>
      <div className="map-sidebar-content-wrapper">
        <h2 className="map-sidebar-section-title"style={{ marginTop: '-5px' }} data-text="Map Management">Map Management</h2>
        <hr className="map-sidebar-hr" />

        {/* ✨ CHANGED: User Administration Section */}
        {(userRole === 'ADMIN' || userRole === 'SUPER_ADMIN') && allUsers.length > 0 && (
          <div className="map-sidebar-admin-section">
            <h3 className="map-sidebar-section-title" data-text="Users">Users</h3>
            <select
              className="map-sidebar-dropdown-select"
              onChange={(e) => {
                const userId = e.target.value;
                const user = allUsers.find(u => u.id === Number(userId)); // Convert userId to number
                handleUserSelectForAdminView(user || null);
                if (user) {
                  showToast(`User selected: ${user.email}`, 'info');
                  setNewEmailForUser(user.email); // Set current email of selected user
                } else {
                  showToast('Viewing own polygons or all', 'info');
                  setNewEmailForUser(''); // Clear input field
                }
              }}
              value={selectedUserForAdminView ? selectedUserForAdminView.id : ''}
              disabled={isFetchingPolygons}
            >
              <option value="">{userRole === 'SUPER_ADMIN' ? 'All Users' : 'My Polygons'}</option>
              {allUsers.map(user => (
                <option key={user.id} value={user.id}>
                  {user.email} (ID: {user.id})
                </option>
              ))}
            </select>

            {selectedUserForAdminView && ( // Show edit fields only if user is selected
              <div className="admin-user-edit-block">
                <input
                  type="email"
                  className="map-sidebar-input" // Use new class for styling
                  placeholder="New user email"
                  value={newEmailForUser}
                  onChange={(e) => setNewEmailForUser(e.target.value)}
                  disabled={isSavingPolygon || isFetchingPolygons}
                />
                <button
                  onClick={() => {
                    if (selectedUserForAdminView && newEmailForUser.trim() !== '') {
                      actualOnUpdateSelectedUserEmail(selectedUserForAdminView.id, newEmailForUser.trim());
                    } else {
                      showToast('Select a user and enter a new email.', 'warning');
                    }
                  }}
                  disabled={isSavingPolygon || isFetchingPolygons || !selectedUserForAdminView || newEmailForUser.trim() === ''}
                  className="map-sidebar-button admin-action-button" // Use new class for styling
                >
                  Change Email
                </button>
              </div>
            )}
            <hr className="map-sidebar-hr" />
          </div>
        )}

        <div className="map-sidebar-controls">
          <button
            onClick={startDrawing}
            disabled={isDrawing || isEditingMode || isSavingPolygon || isFetchingPolygons || (userRole === 'DEMO' && polygons.length >= 1)}
            className="map-sidebar-button draw-button"
            aria-label={isDrawing ? 'Drawing active' : 'Start drawing polygon'}
          >
            {isDrawing ? '✏️ Drawing' : '✏️ Draw'}
          </button>

          <button
            onClick={clearAll}
            disabled={isSavingPolygon || isFetchingPolygons || polygons.length === 0}
            className="map-sidebar-button clear-button"
            aria-label="Clear all polygons"
          >
            🗑️ Clear
          </button>

          <button
            onClick={() => {
              if (!showPolygonsList) {
                showMyPolygons(selectedUserForAdminView ? selectedUserForAdminView.id : null);
              }
              setShowPolygonsList(prev => !prev);
            }}
            disabled={isSavingPolygon || isFetchingPolygons || isDrawing || isEditingMode}
            className="map-sidebar-button toggle-list-button"
            aria-label={isFetchingPolygons ? 'Loading list' : (showPolygonsList ? 'Hide polygon list' : 'Show polygon list')}
          >
            {isFetchingPolygons ? '📂 Loading...' : '👀 List'}
          </button>
        </div>

        <hr className="map-sidebar-hr" />

        {showPolygonsList && polygons.length > 0 ? ( 
          <div className="polygon-list-section">
            <h3 className="polygon-list-header" data-text={`Polygons (${polygons.length})`}>
              📐 Polygons ({polygons.length})
            </h3>
            <div className="polygon-list-container">
              {polygons.map((polygon) => { // Removed idx from here as it's not used for key
                const canModifyThisPolygon = canEditPolygon(polygon); // Use common function

                return (
                  <div
                    key={polygon.id} // Use polygon.id directly as the key
                    className={`polygon-item ${selectedPolygon && selectedPolygon.id === polygon.id ? 'selected' : ''}`}
                    onClick={() => {
                      setSelectedPolygon(polygon); 
                      flyToPolygon(polygon); // NEW: Fly to the selected polygon
                      if (canModifyThisPolygon) { // Only if there are rights, start editing
                        handleEditPolygon(polygon.id); 
                      } else {
                        showToast("You do not have permission to edit this polygon.", "warning");
                      }
                    }}
                  >
                    <div className="polygon-item-header">
                      {selectedPolygon && selectedPolygon.id === polygon.id ? (
                        <input
                          type="text"
                          value={polygon.name || ''}
                          onChange={(e) => {
                            e.stopPropagation();
                            updatePolygonName(polygon.id, e.target.value);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === 'Return') {
                              e.stopPropagation();
                              const updatedPoly = polygons.find(p => p.id === polygon.id);
                              if (updatedPoly && updatedPoly.name !== (e.target.value || '').trim()) {
                                 const polyToSave = { ...updatedPoly, name: (e.target.value || '').trim() };
                                 savePolygonToDatabase(polyToSave, true);
                              }
                              e.target.blur();
                            }
                          }}
                          onBlur={(e) => {
                            e.stopPropagation();
                            const updatedPoly = polygons.find(p => p.id === polygon.id);
                            if (updatedPoly && updatedPoly.name !== (e.target.value || '').trim()) {
                               const polyToSave = { ...updatedPoly, name: (e.target.value || '').trim() };
                               savePolygonToDatabase(polyToSave, true);
                            }
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="polygon-name-input"
                          disabled={isSavingPolygon || isFetchingPolygons || !canModifyThisPolygon} // Disable if no rights
                        />
                      ) : (
                        <strong className="polygon-name-display">
                          {polygon.name || `Polygon #${polygons.indexOf(polygon) + 1}`} {/* Use index for display if no name */}
                        </strong>
                      )}

                      <div className="polygon-actions">
                        <button
                          onClick={(e) => { e.stopPropagation(); deletePolygon(polygon.id); }}
                          className="polygon-action-button delete"
                          disabled={isSavingPolygon || isFetchingPolygons || !canModifyThisPolygon} // Disable if no rights
                        >
                          Delete
                        </button>
                        {(selectedPolygon && selectedPolygon.id === polygon.id && (isEditingMode || isDrawing)) && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleStopAndSaveEdit(polygon.id); }}
                            disabled={(!isEditingMode && !isDrawing) || isSavingPolygon || isFetchingPolygons || !canModifyThisPolygon} // Disable if no rights
                            className="polygon-action-button save-polygon"
                          >
                            {isSavingPolygon ? '💾 Saving...' : '💾 Save'}
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="polygon-details-info">
                      <span>Points: {polygon.coordinates.length}</span>
                      <span>Area: {formatArea(calculateArea(polygon.coordinates))}</span>
                      <div style={{ backgroundColor: polygon.color }} className="polygon-color-box"></div>
                    </div>
                    {selectedPolygon && selectedPolygon.id === polygon.id && (
                      <div className="polygon-meta-edit">
                        <div className="polygon-meta-group">
                          <label htmlFor={`color-picker-${polygon.id}`} className="polygon-detail-label">
                            Polygon Color:
                          </label>
                          <input
                            id={`color-picker-${polygon.id}`}
                            type="color"
                            value={polygon.color || '#000000'}
                            onChange={(e) => {
                              e.stopPropagation();
                              updatePolygonColor(polygon.id, e.target.value);
                            }}
                            onBlur={(e) => {
                              e.stopPropagation();
                              const originalPoly = polygons.find(p => p.id === polygon.id);
                              if (originalPoly && originalPoly.color !== e.target.value) {
                                  const polyToSave = { ...originalPoly, color: e.target.value };
                                  savePolygonToDatabase(polyToSave, true);
                              }
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="polygon-color-input"
                            disabled={isSavingPolygon || isFetchingPolygons || !canModifyThisPolygon} // Disable if no rights
                          />
                        </div>

                        <div className="polygon-meta-group">
                          <label htmlFor={`chapter-select-${polygon.id}`} className="polygon-detail-label">
                            Crop Chapter:
                          </label>
                          <select
                            id={`chapter-select-${polygon.id}`}
                            value={selectedChapter}
                            onChange={(e) => {
                              e.stopPropagation();
                              setSelectedChapter(e.target.value);
                              setSelectedCrop('');
                              setSelectedVariety('');
                              handleUpdatePolygonCrop(polygon.id, e.target.value, '', '');
                            }}
                            onBlur={(e) => {
                                e.stopPropagation();
                            }}
                            disabled={isSavingPolygon || isFetchingPolygons || loadingCropData || !canModifyThisPolygon} // Disable if no rights
                            className="polygon-crop-select"
                          >
                            <option value="">Select Chapter</option>
                            {chapters.map((chapter) => (
                              <option key={chapter} value={chapter}>
                                {chapter}
                              </option>
                            ))}
                          </select>
                        </div>

                        {selectedChapter && (
                          <div className="polygon-meta-group">
                            <label htmlFor={`crop-select-${polygon.id}`} className="polygon-detail-label">
                              Crop:
                            </label>
                            <select
                              id={`crop-select-${polygon.id}`}
                              value={selectedCrop}
                              onChange={(e) => {
                                e.stopPropagation();
                                console.log('MapSidebar: Variety selected:', e.target.value);
                                setSelectedCrop(e.target.value);
                                setSelectedVariety('');
                                handleUpdatePolygonCrop(polygon.id, selectedChapter, e.target.value, '');
                              }}
                              onBlur={(e) => {
                                  e.stopPropagation();
                              }}
                              disabled={isSavingPolygon || isFetchingPolygons || loadingCropData || !selectedChapter || !canModifyThisPolygon} // Disable if no rights
                              className="polygon-crop-select"
                            >
                              <option value="">Select Crop</option>
                              {cropsByChapter.map((crop) => (
                                <option key={crop.name || ''} value={crop.name || ''}>
                                  {crop.name || 'Unknown Crop'}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                        {selectedCrop && (
                          <div className="polygon-meta-group">
                            <label htmlFor={`variety-select-${polygon.id}`} className="polygon-detail-label">
                              Variety:
                            </label>
                            <select
                              id={`variety-select-${polygon.id}`}
                              value={selectedVariety}
                              onChange={(e) => {
                                e.stopPropagation();
                                console.log('MapSidebar: Variety selected:', e.target.value);
                                setSelectedVariety(e.target.value);
                                handleUpdatePolygonCrop(polygon.id, selectedChapter, selectedCrop, e.target.value);
                              }}
                              onBlur={(e) => {
                                  e.stopPropagation();
                              }}
                              disabled={isSavingPolygon || isFetchingPolygons || loadingCropData || !selectedCrop || !canModifyThisPolygon} // Disable if no rights
                              className="polygon-crop-select"
                            >
                              <option value="">Select Variety</option>
                              {varietiesByCrop.map((variety) => (
                                <option key={variety} value={variety}>
                                  {variety}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                        {cropDataError && (
                          <div className="crops-error-message">
                            ⚠️ {cropDataError}
                          </div>
                        )}

                        <div className="polygon-meta-group">
                          <label htmlFor={`comment-input-${polygon.id}`} className="polygon-detail-label">
                            Comment:
                          </label>
                          <input
                            id={`comment-input-${polygon.id}`}
                            type="text"
                            placeholder="Add comment..."
                            value={polygon.comment || ''}
                            onChange={(e) => {
                              e.stopPropagation();
                              updatePolygonComment(polygon.id, e.target.value);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === 'Return') {
                                e.stopPropagation();
                                const updatedPoly = polygons.find(p => p.id === polygon.id);
                                if (updatedPoly && updatedPoly.comment !== (e.target.value || '').trim()) {
                                   const polyToSave = { ...updatedPoly, comment: (e.target.value || '').trim() };
                                   savePolygonToDatabase(polyToSave, true);
                                }
                                e.target.blur();
                              }
                            }}
                            onBlur={(e) => {
                              e.stopPropagation();
                              const originalPoly = polygons.find(p => p.id === polygon.id);
                              if (originalPoly && originalPoly.comment !== (e.target.value || '').trim()) {
                                const polyToSave = { ...originalPoly, comment: (e.target.value || '').trim() };
                                savePolygonToDatabase(polyToSave, true);
                              }
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="polygon-comment-input"
                            disabled={isSavingPolygon || isFetchingPolygons || !canModifyThisPolygon} // Disable if no rights
                          />
                        </div>
                      </div>
                    )}
                    {selectedPolygon && selectedPolygon.id !== polygon.id && (
                      <div className="polygon-summary-display">
                        {polygon.crop && `🌾 ${polygon.crop}`}
                        {polygon.crop && polygon.comment && ' | '}
                        {polygon.comment && `💬 ${polygon.comment}`}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : ( 
          showPolygonsList && !isFetchingPolygons && (
            <div className="polygon-list-section">
              <h3 className="polygon-list-header">
                📐 Polygons (0)
              </h3>
              <p className="no-polygons-message">No polygons found.</p>
            </div>
          )
        )}
      </div>

      {showCropsSection && (
        <div className="crops-summary-section">
          <div className="crops-summary-header">
            <h4 className="crops-summary-title">
              🌾 Crop Summary
            </h4>
            <div className="crops-summary-actions">
              <button
                onClick={() => fetchApiData(`${BASE_API_URL}/api/v1/crops/chapters`, setChapters, 'Failed to update crop chapters')}
                disabled={loadingCropData || isSavingPolygon || isFetchingPolygons}
                className="crops-summary-button"
                aria-label="Refresh crop data"
              >
                {loadingCropData ? 'Loading...' : ''}
              </button>
              <button
                onClick={clearAllCrops}
                disabled={isSavingPolygon || isFetchingPolygons}
                className="crops-summary-button clear-crops"
                aria-label="Clear all crops"
              >
                🗑️
              </button>
            </div>
          </div>

          {cropDataError && (
            <div className="crops-error-message">
              ⚠️ {cropDataError}
            </div>
          )}

          <div className="crops-summary-content">
            <div className="crops-summary-details">
              <div><strong>Summary:</strong></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px' }}>
                <div>Polygons: {polygons.length}</div>
                <div>With crops: {polygons.filter((p) => p.crop).length}</div>
                <div style={{ gridColumn: '1 / -1' }}>
                  Total area:{' '}
                  {formatArea(polygons.reduce((total, p) => total + calculateArea(p.coordinates), 0))}
                </div>
              </div>
              {polygons.some((p) => p.crop) && (
                <div className="crops-by-type">
                  <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>By Crop:</div>
                  <div className="crops-by-type-list">
                    {Object.entries(
                      polygons.filter((p) => p.crop).reduce((acc, p) => {
                        const area = calculateArea(p.coordinates);
                        const fullCrop = p.crop;
                        if (fullCrop) {
                            acc[fullCrop] = (acc[fullCrop] || 0) + area;
                        }
                        return acc;
                      }, {})
                    ).map(([fullCrop, area]) => (
                      <div key={fullCrop} className="crop-tag">
                        {fullCrop}: {formatArea(area)}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Resizer Handle */}
      <div className="resizer" onMouseDown={handleMouseDown}></div>
    </div>
  );
}
