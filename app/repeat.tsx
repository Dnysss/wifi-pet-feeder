import React, { useState } from "react";

import { Pressable, StyleSheet, Text, View } from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

import { SafeAreaView } from "react-native-safe-area-context";

// DIAS DA SEMANA

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
  // DIAS SELECIONADOS

  const [selectedDays, setSelectedDays] = useState<string[]>([]);

  // SELECIONAR / DESSELECIONAR DIA

  function toggleDay(dayId: string) {
    setSelectedDays((currentDays) => {
      if (currentDays.includes(dayId)) {
        return currentDays.filter((day) => day !== dayId);
      }

      return [...currentDays, dayId];
    });
  }

  // APENAS UMA VEZ

  function selectOnlyOnce() {
    setSelectedDays([]);
  }

  // VOLTAR

  function handleBack() {
    console.log("Dias selecionados:", selectedDays);
    router.back();
  }

  return (
    <SafeAreaView edges={["top"]} style={styles.container}>
      {/* HEADER */}

      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={handleBack}>
          <Ionicons name="chevron-back" size={25} color="#222" />
          <Text style={styles.backText}>Voltar</Text>
        </Pressable>
        <Text style={styles.title}>Repetir</Text>
        <View style={styles.headerSpace} />
      </View>

      {/* APENAS UMA VEZ*/}

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

      {/* DIAS DA SEMANA */}
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
    </SafeAreaView>
  );
}

// ESTILOS

const styles = StyleSheet.create({
  container: {
    flex: 1,

    backgroundColor: "#FFFFFF",
  },

  // HEADER

  header: {
    height: 65,

    borderBottomWidth: 1,

    borderBottomColor: "#EEEEEE",

    flexDirection: "row",

    alignItems: "center",

    justifyContent: "space-between",

    paddingHorizontal: 15,
  },

  backButton: {
    width: 90,

    flexDirection: "row",

    alignItems: "center",
  },

  backText: {
    fontSize: 16,

    color: "#222",
  },

  title: {
    fontSize: 17,

    fontWeight: "600",

    color: "#222",
  },

  headerSpace: {
    width: 90,
  },

  // LINHAS

  row: {
    height: 64,

    paddingHorizontal: 20,

    borderBottomWidth: 1,

    borderBottomColor: "#F0F0F0",

    flexDirection: "row",

    alignItems: "center",

    justifyContent: "space-between",
  },

  dayText: {
    fontSize: 17,

    color: "#555",
  },

  selectedText: {
    color: "#222",

    fontWeight: "500",
  },
});
