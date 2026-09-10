import { Pressable, StyleSheet, Switch, Text, View } from "react-native";

type FeedCardProps = {
  time: string;
  days: string;
  portions: number;
  enabled: boolean;
  onToggle: () => void;
  onPress: () => void;
};

export default function FeedCard({
  time,
  days,
  portions,
  enabled,
  onToggle,
  onPress,
}: FeedCardProps) {
  return (
    <Pressable style={styles.feedCard} onPress={onPress}>
      <Text style={styles.feedTime}>{time}</Text>

      <Text style={styles.feedDays}>{days}</Text>

      <Text style={styles.feedPortions}>Feed: {portions} Porções</Text>

      <View style={styles.switchContainer}>
        <Switch
          value={enabled}
          onValueChange={onToggle}
          trackColor={{
            false: "#B8B8B8",
            true: "#00CFA5",
          }}
          thumbColor="#FFFFFF"
          ios_backgroundColor="#B8B8B8"
          style={styles.switch}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  feedCard: {
    height: 80,
    backgroundColor: "#FFFFFF",
    borderRadius: 17,
    marginBottom: 15,
    paddingLeft: 15,
    paddingTop: 9,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.18,
    shadowRadius: 2,
    elevation: 3,
  },
  feedTime: {
    fontSize: 17,
    fontWeight: "700",
    color: "#164B4C",
    marginBottom: 3,
  },
  feedDays: {
    fontSize: 9,
    color: "#111111",
    marginBottom: 3,
  },
  feedPortions: {
    fontSize: 9,
    color: "#111111",
  },
  switchContainer: {
    position: "absolute",
    right: 8,
    top: 22,
  },
  switch: {
    transform: [
      {
        scaleX: 0.95,
      },
      {
        scaleY: 0.95,
      },
    ],
  },
});
