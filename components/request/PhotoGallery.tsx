import { BorderRadius, Overlays, Spacing } from "@/styles";
import { useThemeColors } from "@/styles/theme";
import { Ionicons } from "@expo/vector-icons";
import { useRef, useState } from "react";
import {
  Dimensions,
  Image,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import PagerView from "react-native-pager-view";
import { SafeAreaView } from "react-native-safe-area-context";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const IMAGE_WIDTH = SCREEN_WIDTH - Spacing.lg * 2;

interface PhotoGalleryProps {
  photos: string[];
  mode?: "inline" | "thumbnail";
  thumbnailSize?: number;
}

export default function PhotoGallery({
  photos,
  mode = "inline",
  thumbnailSize = 80,
}: PhotoGalleryProps) {
  const colors = useThemeColors();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalIndex, setModalIndex] = useState(0);
  const modalPagerRef = useRef<PagerView>(null);

  const openModal = (index: number) => {
    setModalIndex(index);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
  };

  if (!photos || photos.length === 0) {
    return null;
  }

  // ─── Full Screen Modal (shared by both modes) ─────────────────────────────
  const FullScreenModal = () => (
    <Modal
      visible={modalVisible}
      transparent={true}
      animationType="fade"
      onRequestClose={closeModal}
      statusBarTranslucent // Android: modal covers status bar
    >
      <View style={[styles.modalOverlay, { backgroundColor: Overlays.heavy }]}>
        <SafeAreaView style={styles.modalSafeArea} edges={["top", "bottom"]}>
          {/* Close Button — safe area aware, no hardcoded top */}
          <Pressable
            style={styles.closeButton}
            onPress={closeModal}
            hitSlop={12}
          >
            <View style={styles.closeButtonInner}>
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </View>
          </Pressable>

          {/* PagerView for smooth iOS swiping */}
          <PagerView
            ref={modalPagerRef}
            style={styles.pager}
            initialPage={modalIndex}
            onPageSelected={(e) => setModalIndex(e.nativeEvent.position)}
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
          </PagerView>

          {/* Photo Counter — always white on dark bg, visible in any theme */}
          {photos.length > 1 && (
            <View style={styles.modalPagination}>
              <Ionicons name="images-outline" size={16} color="#FFFFFF" />
              <Text style={styles.modalPaginationText}>
                {modalIndex + 1} / {photos.length}
              </Text>
            </View>
          )}
        </SafeAreaView>
      </View>
    </Modal>
  );

  // ─── Thumbnail Mode ────────────────────────────────────────────────────────
  if (mode === "thumbnail") {
    return (
      <>
        <View style={styles.thumbnailContainer}>
          {photos.map((photo, index) => (
            <Pressable
              key={index}
              onPress={() => openModal(index)}
              style={[
                styles.thumbnail,
                { width: thumbnailSize, height: thumbnailSize },
              ]}
            >
              <Image source={{ uri: photo }} style={styles.thumbnailImage} />
              {photos.length > 1 && (
                <View style={styles.thumbnailBadge}>
                  <Ionicons name="images-outline" size={10} color="#FFFFFF" />
                  <Text style={styles.thumbnailBadgeText}>
                    {index + 1}/{photos.length}
                  </Text>
                </View>
              )}
            </Pressable>
          ))}
        </View>
        <FullScreenModal />
      </>
    );
  }

  // ─── Inline Mode ──────────────────────────────────────────────────────────
  return (
    <>
      <View style={styles.container}>
        {/* Use PagerView for inline mode too — consistent swiping */}
        <PagerView
          style={styles.inlinePager}
          initialPage={0}
          onPageSelected={(e) => setCurrentIndex(e.nativeEvent.position)}
        >
          {photos.map((photo, index) => (
            <Pressable
              key={index}
              onPress={() => openModal(index)} // opens at correct index
              style={styles.imageContainer}
            >
              <Image
                source={{ uri: photo }}
                style={styles.image}
                resizeMode="cover"
              />
            </Pressable>
          ))}
        </PagerView>

        {photos.length > 1 && (
          <View style={styles.pagination}>
            <Text style={styles.paginationText}>
              {currentIndex + 1} / {photos.length}
            </Text>
          </View>
        )}

        <Pressable
          style={styles.expandButton}
          onPress={() => openModal(currentIndex)}
          hitSlop={8}
        >
          <Ionicons name="expand-outline" size={18} color="#FFFFFF" />
        </Pressable>
      </View>

      <FullScreenModal />
    </>
  );
}

const styles = StyleSheet.create({
  // ─── Inline Mode ────────────────────────────────────────────────────────
  container: {
    position: "relative",
  },
  inlinePager: {
    width: IMAGE_WIDTH,
    height: 250,
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
  },
  imageContainer: {
    flex: 1,
  },
  image: {
    width: "100%",
    height: "100%",
    borderRadius: BorderRadius.lg,
  },
  pagination: {
    position: "absolute",
    bottom: Spacing.sm,
    right: Spacing.sm,
    backgroundColor: "rgba(0, 0, 0, 0.6)", // always dark — readable in any theme
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  paginationText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FFFFFF", // always white — no theme dependency
  },
  expandButton: {
    position: "absolute",
    top: Spacing.sm,
    right: Spacing.sm,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    padding: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },

  // ─── Thumbnail Mode ──────────────────────────────────────────────────────
  thumbnailContainer: {
    flexDirection: "row",
    gap: Spacing.sm,
    flexWrap: "wrap",
  },
  thumbnail: {
    borderRadius: BorderRadius.md,
    overflow: "hidden",
    position: "relative",
  },
  thumbnailImage: {
    width: "100%",
    height: "100%",
  },
  thumbnailBadge: {
    position: "absolute",
    bottom: 4,
    right: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    backgroundColor: "rgba(0, 0, 0, 0.6)", // hardcoded for guaranteed contrast
  },
  thumbnailBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#FFFFFF",
  },

  // ─── Full Screen Modal ───────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
  },
  modalSafeArea: {
    flex: 1,
  },
  closeButton: {
    position: "absolute",
    top: Platform.OS === "ios" ? 12 : 16, // relative to SafeAreaView, not screen
    right: Spacing.lg,
    zIndex: 10,
  },
  closeButtonInner: {
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    borderRadius: 20,
    padding: 8,
  },
  pager: {
    flex: 1,
  },
  modalImageContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  modalImage: {
    width: SCREEN_WIDTH,
    height: "100%",
  },
  modalPagination: {
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    marginBottom: Spacing.md, // sits just above safe area bottom edge
  },
  modalPaginationText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
