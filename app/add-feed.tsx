import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);
const FEED_TIMES = Array.from({ length: 60 }, (_, i) => i + 1);
const DAYS = [
  { id: "mon", label: "Seg." },
  { id: "tue", label: "Ter." },
  { id: "wed", label: "Qua." },
  { id: "thu", label: "Qui." },
  { id: "fri", label: "Sex." },
  { id: "sat", label: "Sáb." },
  { id: "sun", label: "Dom." },
];

export default function AddFeed() {
  const params = useLocalSearchParams();

  const [hour, setHour] = useState(8);
  const [minute, setMinute] = useState(0);
  const [feedVisible, setFeedVisible] = useState(false);
  const [feedTime, setFeedTime] = useState(5);
  const [tempFeedTime, setTempFeedTime] = useState(5);

  const selectedDays: string[] = params.days
    ? JSON.parse(params.days as string)
    : [];

  const getRepeatText = () => {
    if (selectedDays.length === 0) return "Apenas uma vez";
    return DAYS.filter((d) => selectedDays.includes(d.id))
      .map((d) => d.label)
      .join(", ");
  };

  const handleSave = () => {
    const selectedTime = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
    const selectedLabels = DAYS.filter((d) => selectedDays.includes(d.id)).map(
      (d) => d.label,
    );
    const daysText =
      selectedDays.length === 0 ? "Apenas uma vez" : selectedLabels.join(", ");

    router.replace({
      pathname: "/",
      params: {
        newFeed: JSON.stringify({
          time: selectedTime,
          days: selectedDays,
          daysText,
          feedTime,
        }),
      },
    });
  };

  const clampIndex = (y: number, max: number) => {
    const idx = Math.round(y / 50);
    return Math.max(0, Math.min(max - 1, idx));
  };

  return (
    <SafeAreaView edges={["top"]} style={styles.container}>
      <View style={styles.header}>
        <Pressable style={styles.cancelButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#222" />
          <Text style={styles.cancelText}>Cancelar</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Alimentação</Text>
        <Pressable style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveText}>Salvar</Text>
        </Pressable>
      </View>

      <View style={styles.timePickerContainer}>
        <View style={styles.wheelWrapper}>
          <FlatList
            data={HOURS}
            keyExtractor={(i) => i.toString()}
            showsVerticalScrollIndicator={false}
            snapToInterval={50}
            decelerationRate="fast"
            initialScrollIndex={hour}
            getItemLayout={(_, index) => ({
              length: 50,
              offset: 50 * index,
              index,
            })}
            contentContainerStyle={{ paddingVertical: 50 }}
            renderItem={({ item }) => (
              <View style={styles.wheelItem}>
                <Text
                  style={[
                    styles.wheelText,
                    item === hour && styles.selectedWheelText,
                  ]}
                >
                  {String(item).padStart(2, "0")}
                </Text>
              </View>
            )}
            onMomentumScrollEnd={(e) =>
              setHour(clampIndex(e.nativeEvent.contentOffset.y, HOURS.length))
            }
          />
        </View>

        <Text style={styles.colon}>:</Text>

        <View style={styles.wheelWrapper}>
          <FlatList
            data={MINUTES}
            keyExtractor={(i) => i.toString()}
            showsVerticalScrollIndicator={false}
            snapToInterval={50}
            decelerationRate="fast"
            initialScrollIndex={minute}
            getItemLayout={(_, index) => ({
              length: 50,
              offset: 50 * index,
              index,
            })}
            contentContainerStyle={{ paddingVertical: 50 }}
            renderItem={({ item }) => (
              <View style={styles.wheelItem}>
                <Text
                  style={[
                    styles.wheelText,
                    item === minute && styles.selectedWheelText,
                  ]}
                >
                  {String(item).padStart(2, "0")}
                </Text>
              </View>
            )}
            onMomentumScrollEnd={(e) =>
              setMinute(
                clampIndex(e.nativeEvent.contentOffset.y, MINUTES.length),
              )
            }
          />
        </View>
      </View>

      <Pressable style={styles.option} onPress={() => router.push("/repeat")}>
        <Text style={styles.optionTitle}>Repetir</Text>
        <View style={styles.optionRight}>
          <Text style={styles.optionValue} numberOfLines={1}>
            {getRepeatText()}
          </Text>
          <Ionicons name="chevron-forward" size={20} color="#999" />
        </View>
      </Pressable>

      <Pressable
        style={styles.option}
        onPress={() => {
          setTempFeedTime(feedTime);
          setFeedVisible(true);
        }}
      >
        <Text style={styles.optionTitle}>Feed</Text>
        <View style={styles.optionRight}>
          <Text style={styles.optionValue}>{feedTime} segundos</Text>
          <Ionicons name="chevron-forward" size={20} color="#999" />
        </View>
      </Pressable>

      <Modal
        visible={feedVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setFeedVisible(false)}
      >
        <View style={styles.modalBackground}>
          <View style={styles.feedModal}>
            <View style={styles.feedModalHeader}>
              <Text style={styles.feedModalTitle}>Tempo</Text>
            </View>
            <View style={styles.feedWheelContainer}>
              <FlatList
                data={FEED_TIMES}
                keyExtractor={(i) => i.toString()}
                showsVerticalScrollIndicator={false}
                snapToInterval={50}
                decelerationRate="fast"
                initialScrollIndex={tempFeedTime - 1}
                getItemLayout={(_, index) => ({
                  length: 50,
                  offset: 50 * index,
                  index,
                })}
                contentContainerStyle={{ paddingVertical: 50 }}
                renderItem={({ item }) => (
                  <View style={styles.wheelItem}>
                    <Text
                      style={[
                        styles.wheelText,
                        item === tempFeedTime && styles.selectedWheelText,
                      ]}
                    >
                      {item}
                    </Text>
                  </View>
                )}
                onMomentumScrollEnd={(e) => {
                  const idx = clampIndex(
                    e.nativeEvent.contentOffset.y,
                    FEED_TIMES.length,
                  );
                  setTempFeedTime(FEED_TIMES[idx]);
                }}
              />
            </View>
            <View style={styles.feedModalActions}>
              <Pressable
                style={styles.modalActionButton}
                onPress={() => setFeedVisible(false)}
              >
                <Text style={styles.cancelModalText}>Cancelar</Text>
              </Pressable>
              <Pressable
                style={styles.modalActionButton}
                onPress={() => {
                  setFeedTime(tempFeedTime);
                  setFeedVisible(false);
                }}
              >
                <Text style={styles.confirmModalText}>Confirmar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
  cancelButton: {
    flexDirection: "row",
    alignItems: "center",
    width: 90,
  },
  cancelText: {
    fontSize: 16,
    color: "#222",
    marginLeft: 2,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#222",
  },
  saveButton: {
    width: 90,
    alignItems: "flex-end",
  },
  saveText: {
    fontSize: 16,
    color: "#00CFA5",
    fontWeight: "600",
  },
  timePickerContainer: {
    height: 150,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 30,
  },
  wheelWrapper: {
    height: 150,
    width: 70,
    overflow: "hidden",
  },
  wheelItem: {
    height: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  wheelText: {
    fontSize: 24,
    color: "#999",
  },
  selectedWheelText: {
    fontSize: 24,
    color: "#222",
    fontWeight: "600",
  },
  colon: {
    fontSize: 24,
    color: "#222",
    marginHorizontal: 5,
  },
  option: {
    minHeight: 65,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#EEEEEE",
  },
  optionTitle: {
    fontSize: 17,
    color: "#222",
  },
  optionRight: {
    flexDirection: "row",
    alignItems: "center",
    maxWidth: "60%",
  },
  optionValue: {
    fontSize: 15,
    color: "#999",
    marginRight: 5,
  },
  modalBackground: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  feedModal: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 25,
  },
  feedModalHeader: {
    height: 60,
    alignItems: "center",
    justifyContent: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#EEEEEE",
  },
  feedModalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#222",
  },
  feedWheelContainer: {
    height: 150,
    overflow: "hidden",
  },
  feedModalActions: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 10,
  },
  modalActionButton: {
    paddingHorizontal: 30,
    paddingVertical: 12,
  },
  cancelModalText: {
    fontSize: 16,
    color: "#999",
  },
  confirmModalText: {
    fontSize: 16,
    color: "#00CFA5",
    fontWeight: "600",
  },
});
