import { INDIAN_CITIES } from "@/lib/constants/cities";
import { BorderRadius, Colors, Spacing, Typography } from "@/styles";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

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
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredCities = INDIAN_CITIES.filter((city) =>
    city.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleSelect = (city: string) => {
    onChange(city);
    setIsOpen(false);
    setSearchQuery("");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>

      <Pressable
        style={[styles.selector, error && styles.selectorError]}
        onPress={() => setIsOpen(true)}
      >
        <Text
          style={[styles.selectorText, !value && styles.selectorPlaceholder]}
        >
          {value || placeholder}
        </Text>
        <Ionicons name="chevron-down" size={20} color={Colors.text.secondary} />
      </Pressable>

      {error && <Text style={styles.error}>{error}</Text>}

      <Modal
        visible={isOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select {label}</Text>
              <Pressable onPress={() => setIsOpen(false)}>
                <Ionicons name="close" size={24} color={Colors.text.primary} />
              </Pressable>
            </View>

            <TextInput
              style={styles.searchInput}
              placeholder="Search cities..."
              placeholderTextColor={Colors.text.placeholder}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />

            <FlatList
              data={filteredCities}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <Pressable
                  style={[
                    styles.cityItem,
                    value === item && styles.cityItemSelected,
                  ]}
                  onPress={() => handleSelect(item)}
                >
                  <Text
                    style={[
                      styles.cityText,
                      value === item && styles.cityTextSelected,
                    ]}
                  >
                    {item}
                  </Text>
                  {value === item && (
                    <Ionicons
                      name="checkmark"
                      size={20}
                      color={Colors.primary}
                    />
                  )}
                </Pressable>
              )}
              ListEmptyComponent={
                <Text style={styles.emptyText}>No cities found</Text>
              }
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
  },
  label: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  selector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  selectorError: {
    borderColor: Colors.error,
  },
  selectorText: {
    fontSize: Typography.sizes.md,
    color: Colors.text.primary,
  },
  selectorPlaceholder: {
    color: Colors.text.placeholder,
  },
  error: {
    fontSize: Typography.sizes.xs,
    color: Colors.error,
    marginTop: Spacing.xs,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: Colors.background.primary,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: "80%",
    paddingTop: Spacing.lg,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  modalTitle: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    color: Colors.text.primary,
  },
  searchInput: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    fontSize: Typography.sizes.md,
    color: Colors.text.primary,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  cityItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  cityItemSelected: {
    backgroundColor: Colors.primary + "10",
  },
  cityText: {
    fontSize: Typography.sizes.md,
    color: Colors.text.primary,
  },
  cityTextSelected: {
    color: Colors.primary,
    fontWeight: Typography.weights.semibold,
  },
  emptyText: {
    textAlign: "center",
    padding: Spacing.xl,
    color: Colors.text.tertiary,
    fontSize: Typography.sizes.sm,
  },
});
