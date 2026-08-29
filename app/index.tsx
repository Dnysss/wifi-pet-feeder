import React, { useState } from "react";
import { Pressable, StatusBar, StyleSheet, Text, View } from "react-native";

import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

import { router } from "expo-router";
import FeedCard from "../components/FeedCard";

export default function WifiPetFeeder() {
  const [feeds, setFeeds] = useState([
    {
      id: 1,
      time: "09:00",
      days: "Todos Os Dias",
      portions: 3,
      enabled: true,
    },
    {
      id: 2,
      time: "12:00",
      days: "Todos Os Dias",
      portions: 3,
      enabled: false,
    },
  ]);

  function toggleFeed(id: number) {
    setFeeds((currentFeeds) =>
      currentFeeds.map((feed) =>
        feed.id === id
          ? {
              ...feed,
              enabled: !feed.enabled,
            }
          : feed,
      ),
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#05CFA5" />

      {/* PARTE VERDE */}

      <View style={styles.greenArea}>
        {/* <Text style={styles.title}>
          Wifi Pet Feeder
        </Text>*/}

        {/* Configurações */}
        <Pressable style={styles.settingsButton}>
          <Feather name="settings" size={20} color="#087D6B" />
        </Pressable>

        {/* Programações */}
        <Pressable style={styles.layersButton}>
          <MaterialCommunityIcons
            name="layers-outline"
            size={21}
            color="#087D6B"
          />
        </Pressable>

        {/* Alimentação manual */}
        <Pressable style={styles.manualButton}>
          <Text style={styles.manualText}>Manual Feed</Text>
        </Pressable>
      </View>

      {/* ======================
          PARTE INFERIOR
      ====================== */}

      <View style={styles.bottomArea}>
        <View style={styles.feedList}>
          {feeds.map((feed) => (
            <FeedCard
              key={feed.id}
              time={feed.time}
              days={feed.days}
              portions={feed.portions}
              enabled={feed.enabled}
              onToggle={() => toggleFeed(feed.id)}
            />
          ))}
        </View>

        {/* BOTÃO + */}

        <Pressable
          style={styles.addButton}
          onPress={() => router.push("/add-feed")}
        >
          <Ionicons name="add" size={28} color="#FFFFFF" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F4F8",
  },

  greenArea: {
    height: "42%",

    backgroundColor: "#05CFA5",

    position: "absolute",

    top: 0,
    left: 0,
    right: 0,
  },

  title: {
    position: "absolute",

    top: 5,
    left: 10,

    fontSize: 12,

    color: "#707070",
  },

  settingsButton: {
    position: "absolute",

    top: 116,
    left: 22,

    width: 31,
    height: 31,

    borderRadius: 8,

    backgroundColor: "#FFFFFF",

    alignItems: "center",
    justifyContent: "center",

    elevation: 3,
  },

  layersButton: {
    position: "absolute",

    top: 116,
    right: 22,

    width: 31,
    height: 31,

    borderRadius: 8,

    backgroundColor: "#FFFFFF",

    alignItems: "center",
    justifyContent: "center",

    elevation: 3,
  },

  manualButton: {
    position: "absolute",

    top: 44,

    alignSelf: "center",

    width: 112,
    height: 112,

    borderRadius: 56,

    backgroundColor: "#F7FFF9",

    borderWidth: 1.5,
    borderColor: "#B8B8B8",

    alignItems: "center",
    justifyContent: "center",

    elevation: 4,
  },

  manualText: {
    position: "absolute",

    bottom: 27,

    fontSize: 9,

    color: "#111111",
  },

  bottomArea: {
    position: "absolute",

    left: 0,
    right: 0,
    bottom: 0,

    height: "67%",

    backgroundColor: "#F4F4F8",

    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,

    paddingTop: 44,

    zIndex: 2,
  },

  feedList: {
    paddingHorizontal: 21,
  },

  addButton: {
    position: "absolute",

    bottom: 80,

    alignSelf: "center",

    width: 40,
    height: 40,

    borderRadius: 10,

    backgroundColor: "#00CFA5",

    alignItems: "center",
    justifyContent: "center",

    elevation: 4,
  },
});
