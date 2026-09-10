import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";


const DAYS = [
  {
    id: "mon",
    label: "Seg.",
  },
  {
    id: "tue",
    label: "Ter.",
  },
  {
    id: "wed",
    label: "Qua.",
  },
  {
    id: "thu",
    label: "Qui.",
  },
  {
    id: "fri",
    label: "Sex.",
  },
  {
    id: "sat",
    label: "Sáb.",
  },
  {
    id: "sun",
    label: "Dom.",
  },
];

export default function Repeat() {
  const [selectedDays, setSelectedDays] = useState<string[]>([]);

  function toggleDay(dayId: string) {
    setSelectedDays((currentDays) => {
      if (currentDays.includes(dayId)) {
        return currentDays.filter((day) => day !== dayId);
      }

      return [...currentDays, dayId];
    });
  }

  function selectOnlyOnce() {
    setSelectedDays([]);
  }

  function handleBack() {
    router.back();
  }

  function handleConfirm() {
    console.log("Dias confirmados:", selectedDays);

    router.replace({
      pathname: "/add-feed",
      params: {
        days: JSON.stringify(selectedDays),
      },
    });
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={handleBack}>
          <Ionicons name="chevron-back" size={25} color="#222" />

          <Text style={styles.backText}>Voltar</Text>
        </Pressable>

        <Text style={styles.title}>Repetir</Text>

        <View style={styles.headerSpace} />
      </View>

      <Pressable style={styles.row} onPress={selectOnlyOnce}>
        <Text
          style={[
            styles.dayText,
            selectedDays.length === 0 && styles.selectedText,
          ]}
        >
          Apenas uma vez
        </Text>

        {selectedDays.length === 0 && (
          <Ionicons name="checkmark" size={22} color="#00CFA5" />
        )}
      </Pressable>

      {DAYS.map((day) => {
        const selected = selectedDays.includes(day.id);

        return (
          <Pressable
            key={day.id}
            style={styles.row}
            onPress={() => toggleDay(day.id)}
          >
            <Text style={[styles.dayText, selected && styles.selectedText]}>
              {day.label}
            </Text>

            {selected && (
              <Ionicons name="checkmark" size={22} color="#00CFA5" />
            )}
          </Pressable>
        );
      })}

      <View style={styles.confirmContainer}>
        <Pressable style={styles.confirmButton} onPress={handleConfirm}>
          <Text style={styles.confirmText}>Confirmar</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    height: 60,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#EEEEEE",
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    width: 90,
  },
  backText: {
    fontSize: 16,
    color: "#222",
    marginLeft: 2,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: "#222",
  },
  headerSpace: {
    width: 90,
  },
  row: {
    height: 55,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 25,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F1F1",
  },
  dayText: {
    fontSize: 17,
    color: "#222",
  },
  selectedText: {
    color: "#00CFA5",
    fontWeight: "600",
  },
  confirmContainer: {
    marginTop: "auto",
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  confirmButton: {
    height: 52,
    borderRadius: 12,
    backgroundColor: "#00CFA5",
    alignItems: "center",
    justifyContent: "center",
  },
  confirmText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "600",
  },
});
