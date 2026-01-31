import { BorderRadius, Overlays, Spacing } from "@/styles";
import { useThemeColors } from "@/styles/theme";
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
  mode?: "inline" | "thumbnail"; // NEW: Display mode
  thumbnailSize?: number; // NEW: Size for thumbnail mode
}

export default function PhotoGallery({
  photos,
  mode = "inline",
  thumbnailSize = 80,
}: PhotoGalleryProps) {
  const colors = useThemeColors();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [modalVisible, setModalVisible] = useState(false);

  const handleScroll = (event: any) => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    const index =
      mode === "inline"
        ? Math.round(scrollPosition / IMAGE_WIDTH)
        : Math.round(scrollPosition / SCREEN_WIDTH);
    setCurrentIndex(index);
  };

  if (!photos || photos.length === 0) {
    return null;
  }

  // Thumbnail mode - small clickable previews
  if (mode === "thumbnail") {
    return (
      <>
        <View style={styles.thumbnailContainer}>
          {photos.map((photo, index) => (
            <Pressable
              key={index}
              onPress={() => {
                setCurrentIndex(index);
                setModalVisible(true);
              }}
              style={[
                styles.thumbnail,
                { width: thumbnailSize, height: thumbnailSize },
              ]}
            >
              <Image source={{ uri: photo }} style={styles.thumbnailImage} />
              {photos.length > 1 && (
                <View
                  style={[
                    styles.thumbnailBadge,
                    { backgroundColor: colors.background.overlay },
                  ]}
                >
                  <Ionicons
                    name="images-outline"
                    size={12}
                    color={colors.text.inverse}
                  />
                  <Text
                    style={[
                      styles.thumbnailBadgeText,
                      { color: colors.text.inverse },
                    ]}
                  >
                    {index + 1}/{photos.length}
                  </Text>
                </View>
              )}
            </Pressable>
          ))}
        </View>

        {/* Full Screen Modal */}
        <Modal
          visible={modalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setModalVisible(false)}
        >
          <View
            style={[styles.modalContainer, { backgroundColor: Overlays.heavy }]}
          >
            <Pressable
              style={styles.closeButton}
              onPress={() => setModalVisible(false)}
            >
              <Ionicons name="close" size={32} color={colors.text.inverse} />
            </Pressable>

            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              style={styles.modalScroll}
              onScroll={handleScroll}
              scrollEventThrottle={16}
              contentOffset={{ x: currentIndex * SCREEN_WIDTH, y: 0 }}
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

            <View
              style={[
                styles.modalPagination,
                { backgroundColor: colors.background.overlay },
              ]}
            >
              <Ionicons
                name="images-outline"
                size={20}
                color={colors.text.inverse}
              />
              <Text
                style={[
                  styles.modalPaginationText,
                  { color: colors.text.inverse },
                ]}
              >
                {currentIndex + 1} / {photos.length}
              </Text>
            </View>
          </View>
        </Modal>
      </>
    );
  }

  // Inline mode - original behavior
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
          <View
            style={[
              styles.pagination,
              { backgroundColor: colors.background.overlay },
            ]}
          >
            <Text
              style={[styles.paginationText, { color: colors.text.inverse }]}
            >
              {currentIndex + 1} / {photos.length}
            </Text>
          </View>
        )}

        <Pressable
          style={[
            styles.expandButton,
            { backgroundColor: colors.background.overlay },
          ]}
          onPress={() => setModalVisible(true)}
        >
          <Ionicons
            name="expand-outline"
            size={20}
            color={colors.text.inverse}
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
        <View
          style={[styles.modalContainer, { backgroundColor: Overlays.heavy }]}
        >
          <Pressable
            style={styles.closeButton}
            onPress={() => setModalVisible(false)}
          >
            <Ionicons name="close" size={32} color={colors.text.inverse} />
          </Pressable>

          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            style={styles.modalScroll}
            onScroll={handleScroll}
            scrollEventThrottle={16}
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

          <View
            style={[
              styles.modalPagination,
              { backgroundColor: colors.background.overlay },
            ]}
          >
            <Ionicons
              name="images-outline"
              size={20}
              color={colors.text.inverse}
            />
            <Text
              style={[
                styles.modalPaginationText,
                { color: colors.text.inverse },
              ]}
            >
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
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  paginationText: {
    fontSize: 12,
    fontWeight: "600",
  },
  expandButton: {
    position: "absolute",
    top: Spacing.sm,
    right: Spacing.lg + Spacing.sm,
    padding: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  // NEW: Thumbnail mode styles
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
  },
  thumbnailBadgeText: {
    fontSize: 10,
    fontWeight: "600",
  },
  modalContainer: {
    flex: 1,
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
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  modalPaginationText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
