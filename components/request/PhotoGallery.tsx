import { BorderRadius, Colors, Spacing } from "@/styles";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  Dimensions,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const IMAGE_WIDTH = SCREEN_WIDTH - Spacing.lg * 2;

interface PhotoGalleryProps {
  photos: string[];
}

export default function PhotoGallery({ photos }: PhotoGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [modalVisible, setModalVisible] = useState(false);

  const handleScroll = (event: any) => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollPosition / IMAGE_WIDTH);
    setCurrentIndex(index);
  };

  if (!photos || photos.length === 0) {
    return null;
  }

  return (
    <>
      <View style={styles.container}>
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
        >
          {photos.map((photo, index) => (
            <Pressable
              key={index}
              onPress={() => setModalVisible(true)}
              style={styles.imageContainer}
            >
              <Image source={{ uri: photo }} style={styles.image} />
            </Pressable>
          ))}
        </ScrollView>

        {photos.length > 1 && (
          <View style={styles.pagination}>
            <Text style={styles.paginationText}>
              {currentIndex + 1} / {photos.length}
            </Text>
          </View>
        )}

        <Pressable
          style={styles.expandButton}
          onPress={() => setModalVisible(true)}
        >
          <Ionicons
            name="expand-outline"
            size={20}
            color={Colors.text.inverse}
          />
        </Pressable>
      </View>

      {/* Full Screen Modal */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <Pressable
            style={styles.closeButton}
            onPress={() => setModalVisible(false)}
          >
            <Ionicons name="close" size={32} color={Colors.text.inverse} />
          </Pressable>

          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            style={styles.modalScroll}
          >
            {photos.map((photo, index) => (
              <View key={index} style={styles.modalImageContainer}>
                <Image
                  source={{ uri: photo }}
                  style={styles.modalImage}
                  resizeMode="contain"
                />
              </View>
            ))}
          </ScrollView>

          <View style={styles.modalPagination}>
            <Text style={styles.modalPaginationText}>
              {currentIndex + 1} / {photos.length}
            </Text>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "relative",
  },
  imageContainer: {
    width: IMAGE_WIDTH,
    height: 250,
    marginRight: Spacing.lg,
  },
  image: {
    width: "100%",
    height: "100%",
    borderRadius: BorderRadius.lg,
  },
  pagination: {
    position: "absolute",
    bottom: Spacing.sm,
    right: Spacing.lg + Spacing.sm,
    backgroundColor: Colors.background.overlay,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  paginationText: {
    color: Colors.text.inverse,
    fontSize: 12,
    fontWeight: "600",
  },
  expandButton: {
    position: "absolute",
    top: Spacing.sm,
    right: Spacing.lg + Spacing.sm,
    backgroundColor: Colors.background.overlay,
    padding: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.95)",
  },
  closeButton: {
    position: "absolute",
    top: 50,
    right: Spacing.lg,
    zIndex: 10,
    padding: Spacing.sm,
  },
  modalScroll: {
    flex: 1,
  },
  modalImageContainer: {
    width: SCREEN_WIDTH,
    justifyContent: "center",
    alignItems: "center",
  },
  modalImage: {
    width: SCREEN_WIDTH,
    height: "100%",
  },
  modalPagination: {
    position: "absolute",
    bottom: 50,
    alignSelf: "center",
    backgroundColor: Colors.background.overlay,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  modalPaginationText: {
    color: Colors.text.inverse,
    fontSize: 16,
    fontWeight: "600",
  },
});
