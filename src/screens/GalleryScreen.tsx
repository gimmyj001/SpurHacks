import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Dimensions,
  Modal,
  Image,
  AppState,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { Socket, io } from 'socket.io-client';

const { width } = Dimensions.get('window');
const numColumns = 2;

interface Photo {
  id: number;
  filename: string;
  original_name: string;
  description: string;
  created_at: string;
}

const GalleryScreen: React.FC = () => {
  const { user } = useAuth();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [description, setDescription] = useState('');
  const [selectedImage, setSelectedImage] = useState<any>(null);
  const [numColumns, setNumColumns] = useState(2);

  const socketRef = useRef<Socket | null>(null);
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    requestPermissions();
    fetchPhotos();
    setupSocket();
    
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        console.log('App has come to the foreground!');
        fetchPhotos();
      }
      appState.current = nextAppState;
    });

    // Set up periodic refresh every 30 seconds as fallback
    const intervalId = setInterval(() => {
      fetchPhotos();
    }, 30000);

    return () => {
      subscription?.remove();
      clearInterval(intervalId);
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  const requestPermissions = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant camera roll permissions to upload photos.');
    }
  };

  const fetchPhotos = async () => {
    try {
      const response = await axios.get('http://172.20.10.2:3001/api/photos');
      setPhotos(response.data);
    } catch (error) {
      console.error('Error fetching photos:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDefaultImages = async () => {
    try {
      await axios.post('http://172.20.10.2:3001/api/add-default-images');
      Alert.alert('Success', 'Default images added! You can now start trading.');
      fetchPhotos();
    } catch (error: any) {
      if (error.response?.status === 400) {
        Alert.alert('Info', 'You already have photos!');
      } else {
        Alert.alert('Error', 'Failed to add default images');
      }
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      await uploadImage(result.assets[0]);
    }
  };

  const takePhoto = async () => {
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      await uploadImage(result.assets[0]);
    }
  };

  const uploadImage = async (imageAsset: any) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('photo', {
        uri: imageAsset.uri,
        type: 'image/jpeg',
        name: 'photo.jpg',
      } as any);
      formData.append('description', description);

      await axios.post('http://172.20.10.2:3001/api/photos', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setDescription('');
      setShowUploadModal(false);
      fetchPhotos();
      Alert.alert('Success', 'Photo uploaded successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to upload photo');
    } finally {
      setUploading(false);
    }
  };

  const deletePhoto = async (photoId: number) => {
    try {
      await axios.delete(`http://172.20.10.2:3001/api/photos/${photoId}`);
      setSelectedPhoto(null);
      fetchPhotos();
      Alert.alert('Success', 'Photo deleted successfully!');
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to delete photo';
      Alert.alert('Error', errorMessage);
    }
  };

  const handleDeletePhoto = (photo: Photo) => {
    Alert.alert(
      'Delete Photo',
      `Are you sure you want to delete "${photo.original_name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deletePhoto(photo.id),
        },
      ]
    );
  };

  const renderPhotoItem = ({ item }: { item: Photo }) => (
    <TouchableOpacity
      style={styles.photoItem}
      onPress={() => setSelectedPhoto(item)}
    >
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.gradientBorder}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.photoContainer}>
          <Image
            source={{ uri: `http://172.20.10.2:3001/uploads/${item.filename}` }}
            style={styles.photoImage}
            resizeMode="cover"
          />
          <View style={styles.photoOverlay}>
            <View style={styles.securityBadge}>
              <Ionicons name="shield-checkmark" size={12} color="white" />
              <Text style={styles.securityText}>Protected</Text>
            </View>
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  const renderUploadModal = () => (
    <Modal
      visible={showUploadModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowUploadModal(false)}
    >
      <BlurView intensity={20} style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Photo</Text>
            <TouchableOpacity onPress={() => setShowUploadModal(false)}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <View style={styles.uploadOptions}>
            <TouchableOpacity style={styles.uploadOption} onPress={takePhoto}>
              <Ionicons name="camera" size={40} color="#667eea" />
              <Text style={styles.uploadOptionText}>Take Photo</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.uploadOption} onPress={pickImage}>
              <Ionicons name="images" size={40} color="#667eea" />
              <Text style={styles.uploadOptionText}>Choose from Library</Text>
            </TouchableOpacity>
          </View>

          {uploading && (
            <View style={styles.uploadingContainer}>
              <ActivityIndicator size="large" color="#667eea" />
              <Text style={styles.uploadingText}>Uploading...</Text>
            </View>
          )}
        </View>
      </BlurView>
    </Modal>
  );

  const renderPhotoViewer = () => (
    <Modal
      visible={!!selectedPhoto}
      transparent
      animationType="fade"
      onRequestClose={() => setSelectedPhoto(null)}
    >
      <View style={styles.viewerOverlay}>
        <View style={styles.viewerHeader}>
          <TouchableOpacity onPress={() => setSelectedPhoto(null)}>
            <Ionicons name="close" size={24} color="white" />
          </TouchableOpacity>
          <View style={styles.viewerHeaderCenter}>
            <View style={styles.securityBadge}>
              <Ionicons name="shield-checkmark" size={16} color="white" />
              <Text style={styles.securityText}>Protected View</Text>
            </View>
          </View>
          <TouchableOpacity 
            style={styles.deleteButton}
            onPress={() => selectedPhoto && handleDeletePhoto(selectedPhoto)}
          >
            <Ionicons name="trash-outline" size={24} color="#ff4757" />
          </TouchableOpacity>
        </View>

        <View style={styles.imageContainer}>
          <Image
            source={{ uri: `http://172.20.10.2:3001/uploads/${selectedPhoto?.filename}` }}
            style={styles.viewerImage}
            resizeMode="contain"
          />
        </View>

        <View style={styles.viewerFooter}>
          <Text style={styles.photoName}>{selectedPhoto?.original_name}</Text>
          {selectedPhoto?.description && (
            <Text style={styles.photoDescription}>{selectedPhoto.description}</Text>
          )}
          <Text style={styles.watermarkText}>© {user?.username} - PhotoTrade</Text>
        </View>
      </View>
    </Modal>
  );

  const setupSocket = () => {
    if (socketRef.current) {
      socketRef.current.disconnect();
    }

    socketRef.current = io('http://172.20.10.2:3001');

    socketRef.current.on('connect', () => {
      console.log('Connected to socket');
      if (user?.id) {
        socketRef.current?.emit('join_user', user.id);
      }
    });

    socketRef.current.on('trade_accepted', (data) => {
      console.log('Trade accepted:', data);
      fetchPhotos();
    });

    socketRef.current.on('trade_declined', (data) => {
      console.log('Trade declined:', data);
      fetchPhotos();
    });

    socketRef.current.on('new_trade', (data) => {
      console.log('New trade:', data);
      fetchPhotos();
    });

    socketRef.current.on('disconnect', () => {
      console.log('Disconnected from socket');
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#667eea" />
          <Text style={styles.loadingText}>Loading photos...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Photo Gallery</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowUploadModal(true)}
        >
          <Ionicons name="add" size={24} color="white" />
        </TouchableOpacity>
      </View>

      <View style={styles.securityNotice}>
        <Ionicons name="shield-checkmark" size={20} color="#667eea" />
        <Text style={styles.securityNoticeText}>
          All photos are watermarked and protected against screenshots
        </Text>
      </View>

      {photos.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="images-outline" size={80} color="#ccc" />
          <Text style={styles.emptyTitle}>No photos yet</Text>
          <Text style={styles.emptySubtitle}>
            Upload your first photo or get default images to start trading with friends
          </Text>
          <View style={styles.emptyButtons}>
            <TouchableOpacity
              style={styles.uploadFirstButton}
              onPress={() => setShowUploadModal(true)}
            >
              <Text style={styles.uploadFirstButtonText}>Upload Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.defaultImagesButton}
              onPress={getDefaultImages}
            >
              <Text style={styles.defaultImagesButtonText}>Get Default Images</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <FlatList
          data={photos}
          renderItem={renderPhotoItem}
          keyExtractor={(item) => item.id.toString()}
          numColumns={numColumns}
          contentContainerStyle={styles.photoGrid}
          showsVerticalScrollIndicator={false}
        />
      )}

      {renderUploadModal()}
      {renderPhotoViewer()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5e9',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  addButton: {
    backgroundColor: '#667eea',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  securityNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e3f2fd',
    padding: 15,
    marginHorizontal: 20,
    marginTop: 15,
    borderRadius: 10,
  },
  securityNoticeText: {
    marginLeft: 10,
    color: '#1976d2',
    fontSize: 14,
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 30,
  },
  uploadFirstButton: {
    backgroundColor: '#667eea',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
  },
  uploadFirstButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  defaultImagesButton: {
    backgroundColor: '#667eea',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    marginLeft: 10,
  },
  defaultImagesButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyButtons: {
    flexDirection: 'row',
    marginTop: 20,
  },
  photoGrid: {
    padding: 10,
  },
  photoItem: {
    flex: 1,
    margin: 5,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  photoImage: {
    width: '100%',
    height: (width - 30) / numColumns,
    borderRadius: 8,
  },
  photoOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(220, 38, 38, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  securityText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
    marginLeft: 4,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 30,
    margin: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  uploadOptions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  uploadOption: {
    alignItems: 'center',
    padding: 20,
  },
  uploadOptionText: {
    marginTop: 10,
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
  },
  uploadingContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  uploadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 16,
  },
  viewerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
  },
  viewerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 50,
  },
  viewerHeaderCenter: {
    flex: 1,
    alignItems: 'center',
  },
  viewerImage: {
    flex: 1,
    margin: 20,
  },
  viewerFooter: {
    padding: 20,
    alignItems: 'center',
  },
  photoName: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  photoDescription: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 10,
  },
  watermarkOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  watermarkGrid: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  watermarkText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 16,
    fontWeight: 'bold',
    margin: 10,
    transform: [{ rotate: '-30deg' }],
  },
  gradientBorder: {
    flex: 1,
    borderRadius: 12,
    padding: 2,
  },
  photoContainer: {
    flex: 1,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: 'white',
  },
  deleteButton: {
    padding: 10,
  },
  imageContainer: {
    flex: 1,
    position: 'relative',
  },
});

export default GalleryScreen; 