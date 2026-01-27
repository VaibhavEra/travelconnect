import { INDIAN_CITIES } from "@/lib/constants/cities";
import { haptics } from "@/lib/utils/haptics";
import { BorderRadius, Spacing, Typography } from "@/styles";
import { useThemeColors } from "@/styles/theme";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface CityDropdownProps {
  label: string;
  value: string;
  onChange: (city: string) => void;
  placeholder?: string;
  error?: string;
}

export default function CityDropdown({
  label,
  value,
  onChange,
  placeholder = "Select city",
  error,
}: CityDropdownProps) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const [isOpen, setIsOpen] = useState(false);

  const handleSelect = (city: string) => {
    haptics.selection();
    onChange(city);
    setIsOpen(false);
  };

  const handleOpen = () => {
    haptics.light();
    setIsOpen(true);
  };

  const handleClose = () => {
    haptics.light();
    setIsOpen(false);
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: colors.text.primary }]}>
        {label}
      </Text>

      <Pressable
        style={[
          styles.selector,
          {
            backgroundColor: colors.background.secondary,
            borderColor: error ? colors.error : colors.border.default,
          },
        ]}
        onPress={handleOpen}
      >
        <Text
          style={[
            styles.selectorText,
            {
              color: value ? colors.text.primary : colors.text.placeholder,
            },
          ]}
          numberOfLines={1}
        >
          {value || placeholder}
        </Text>
        <Ionicons name="chevron-down" size={20} color={colors.text.secondary} />
      </Pressable>

      {error && (
        <Text style={[styles.error, { color: colors.error }]}>{error}</Text>
      )}

      <Modal
        visible={isOpen}
        transparent
        animationType="slide"
        onRequestClose={handleClose}
        statusBarTranslucent
      >
        <View style={styles.modalOverlay}>
          <Pressable style={styles.backdrop} onPress={handleClose} />

          <View
            style={[
              styles.modalContent,
              {
                backgroundColor: colors.background.primary,
                paddingBottom:
                  Platform.OS === "ios" ? insets.bottom : Spacing.lg,
              },
            ]}
          >
            {/* Handle Bar */}
            <View style={styles.handleBar}>
              <View
                style={[
                  styles.handle,
                  { backgroundColor: colors.border.default },
                ]}
              />
            </View>

            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text.primary }]}>
                Select {label}
              </Text>
              <Pressable
                onPress={handleClose}
                hitSlop={10}
                style={[
                  styles.closeButton,
                  { backgroundColor: colors.background.secondary },
                ]}
              >
                <Ionicons name="close" size={20} color={colors.text.primary} />
              </Pressable>
            </View>

            {/* Cities List */}
            <FlatList
              data={INDIAN_CITIES}
              keyExtractor={(item) => item}
              renderItem={({ item }) => {
                const isSelected = value === item;
                return (
                  <Pressable
                    style={[
                      styles.cityItem,
                      isSelected && {
                        backgroundColor: colors.primary + "10",
                      },
                    ]}
                    onPress={() => handleSelect(item)}
                  >
                    <Text
                      style={[
                        styles.cityText,
                        {
                          color: isSelected
                            ? colors.primary
                            : colors.text.primary,
                          fontWeight: isSelected
                            ? Typography.weights.semibold
                            : Typography.weights.normal,
                        },
                      ]}
                    >
                      {item}
                    </Text>
                    {isSelected && (
                      <Ionicons
                        name="checkmark-circle"
                        size={22}
                        color={colors.primary}
                      />
                    )}
                  </Pressable>
                );
              }}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContent}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
  label: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
    marginBottom: Spacing.xs,
  },
  selector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md + 2,
    borderWidth: 1,
    minHeight: 50,
  },
  selectorText: {
    flex: 1,
    fontSize: Typography.sizes.md,
    marginRight: Spacing.sm,
  },
  error: {
    fontSize: Typography.sizes.xs,
    marginTop: Spacing.xs,
  },
  modalOverlay: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: "80%",
    paddingTop: Spacing.xs,
  },
  handleBar: {
    alignItems: "center",
    paddingVertical: Spacing.xs,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  modalTitle: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  listContent: {
    paddingTop: Spacing.xs,
  },
  cityItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    minHeight: 52,
  },
  cityText: {
    fontSize: Typography.sizes.md,
    flex: 1,
  },
});
