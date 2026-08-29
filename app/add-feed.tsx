import React, { useState } from 'react';

import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { SafeAreaView } from 'react-native-safe-area-context'

// ==========================================
// DADOS DA ROLETA
// ==========================================

const HOURS = Array.from(
  { length: 24 },
  (_, index) => index
);

const MINUTES = Array.from(
  { length: 60 },
  (_, index) => index
);

const FEED_TIMES = Array.from(
  { length: 60 },
  (_, index) => index + 1
);


export default function AddFeed() {

  // ==========================================
  // ESTADO DO HORÁRIO
  // ==========================================

  const [hour, setHour] = useState(8);
  const [minute, setMinute] = useState(0);

  const [feedVisible, setFeedVisible] = useState(false);
  const [feedTime, setFeedTime] = useState(5);


  // ==========================================
  // SALVAR
  // ==========================================

  function handleSave() {

    const selectedTime =
      `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

    console.log('Horário selecionado:', selectedTime);

    // Por enquanto apenas mostramos no console.
    // Depois vamos salvar a programação.

  }


  return (
    <SafeAreaView edges={['top']} style={styles.container}>

      {/* ======================================
          HEADER
      ====================================== */}

      <View style={styles.header}>

        {/* CANCELAR */}

        <Pressable
          style={styles.cancelButton}
          onPress={() => router.back()}
        >

          <Ionicons
            name="chevron-back"
            size={24}
            color="#222"
          />

          <Text style={styles.cancelText}>
            Cancelar
          </Text>

        </Pressable>


        {/* TÍTULO */}

        <Text style={styles.headerTitle}>
          Alimentação
        </Text>


        {/* SALVAR */}

        <Pressable
          style={styles.saveButton}
          onPress={handleSave}
        >

          <Text style={styles.saveText}>
            Salvar
          </Text>

        </Pressable>

      </View>


      {/* ======================================
          ROLETA DE HORÁRIO
      ====================================== */}

      <View style={styles.timePickerContainer}>

        {/* HORA */}

        <View style={styles.wheelWrapper}>

          <FlatList
            data={HOURS}

            keyExtractor={(item) =>
              item.toString()
            }

            showsVerticalScrollIndicator={false}

            snapToInterval={50}

            decelerationRate="fast"

            initialScrollIndex={hour}

            getItemLayout={(_, index) => ({
              length: 50,
              offset: 50 * index,
              index,
            })}

            contentContainerStyle={{
              paddingVertical: 50,
            }}

            renderItem={({ item }) => (

              <View style={styles.wheelItem}>

                <Text
                  style={[
                    styles.wheelText,

                    item === hour &&
                      styles.selectedWheelText,
                  ]}
                >
                  {String(item).padStart(2, '0')}
                </Text>

              </View>

            )}

            onMomentumScrollEnd={(event) => {

              const index = Math.round(
                event.nativeEvent.contentOffset.y / 50
              );

              setHour(index);

            }}

          />

        </View>


        {/* DOIS PONTOS */}

        <Text style={styles.colon}>
          :
        </Text>


        {/* MINUTO */}

        <View style={styles.wheelWrapper}>

          <FlatList
            data={MINUTES}

            keyExtractor={(item) =>
              item.toString()
            }

            showsVerticalScrollIndicator={false}

            snapToInterval={50}

            decelerationRate="fast"

            initialScrollIndex={minute}

            getItemLayout={(_, index) => ({
              length: 50,
              offset: 50 * index,
              index,
            })}

            contentContainerStyle={{
              paddingVertical: 50,
            }}

            renderItem={({ item }) => (

              <View style={styles.wheelItem}>

                <Text
                  style={[
                    styles.wheelText,

                    item === minute &&
                      styles.selectedWheelText,
                  ]}
                >
                  {String(item).padStart(2, '0')}
                </Text>

              </View>

            )}

            onMomentumScrollEnd={(event) => {

              const index = Math.round(
                event.nativeEvent.contentOffset.y / 50
              );

              setMinute(index);

            }}

          />

        </View>

      </View>


      {/* ======================================
          LINHA DO HORÁRIO SELECIONADO
      ====================================== */}

      <View
        style={[
          styles.selectionLine,
          styles.selectionLineTop,
        ]}
      />

      <View
        style={[
          styles.selectionLine,
          styles.selectionLineBottom,
        ]}
      />


      {/* ======================================
          REPEAT
      ====================================== */}

      <Pressable
        style={styles.option}
        onPress={() => router.push('/repeat')}
      >

        <Text style={styles.optionTitle}>
          Repetir
        </Text>

        <View style={styles.optionRight}>

          <Text style={styles.optionValue}>
            Apenas uma vez
          </Text>

          <Ionicons
            name="chevron-forward"
            size={20}
            color="#999"
          />

        </View>

      </Pressable>


      {/* ======================================
          FEED
      ====================================== */}

      <Pressable
        style={styles.option}
        onPress={() => setFeedVisible(true)}
      >

        <Text style={styles.optionTitle}>
          Feed
        </Text>

        <View style={styles.optionRight}>

          <Text style={styles.optionValue}>
            {feedTime} segundos
          </Text>

          <Ionicons
            name="chevron-forward"
            size={20}
            color="#999"
          />

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

            {/* ==========================
                TÍTULO
            ========================== */}

            <View style={styles.feedModalHeader}>

              <Text style={styles.feedModalTitle}>
                Tempo
              </Text>

            </View>


            {/* ==========================
                ROLETA
            ========================== */}

            <View style={styles.feedWheelContainer}>

              <FlatList
                data={FEED_TIMES}
                keyExtractor={(item) =>
                  item.toString()
                }
                showsVerticalScrollIndicator={false}
                snapToInterval={50}
                decelerationRate="fast"
                initialScrollIndex={feedTime - 1}
                getItemLayout={(_, index) => ({
                  length: 50,
                  offset: 50 * index,
                  index,
                })}

                contentContainerStyle={{
                  paddingVertical: 50,
                }}
                renderItem={({ item }) => (

                  <View style={styles.wheelItem}>
                    <Text
                      style={[
                        styles.wheelText,
                        item === feedTime &&
                          styles.selectedWheelText,
                      ]}
                    >
                      {item}
                    </Text>
                  </View>

                )}

                onMomentumScrollEnd={(event) => {

                  const index = Math.round(
                    event.nativeEvent.contentOffset.y / 50
                  );

                  setFeedTime(index + 1);

                }}

              />

            </View>


            {/* ==========================
                BOTÕES
            ========================== */}

            <View style={styles.feedModalActions}>

              <Pressable
                style={styles.modalActionButton}
                onPress={() => setFeedVisible(false)}
              >

                <Text style={styles.cancelModalText}>
                  Cancelar
                </Text>

              </Pressable>


              <Pressable
                style={styles.modalActionButton}
                onPress={() => setFeedVisible(false)}
              >

                <Text style={styles.confirmModalText}>
                  Confirmar
                </Text>

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
    backgroundColor: '#FFFFFF',
  },

  // HEADER
  header: {
    height: 65,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
  },

  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 95,
  },

  cancelText: {
    fontSize: 16,
    color: '#222',
  },

  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#222',
  },

  saveButton: {
    width: 60,
    alignItems: 'flex-end',
  },

  saveText: {
    fontSize: 16,
    color: '#00B894',
    fontWeight: '600',
  },

  // ROLETA
  timePickerContainer: {
    height: 280,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },

  wheelWrapper: {
    height: 150,
    width: 75,
    overflow: 'hidden',
  },

  wheelItem: {
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },

  wheelText: {
    fontSize: 24,
    color: '#D5D5D5',
  },

  selectedWheelText: {
    fontSize: 28,
    color: '#111111',
    fontWeight: '500',
  },

  colon: {
    fontSize: 27,
    color: '#111111',
    marginHorizontal: 8,
  },

  // LINHAS DA SELEÇÃO
  selectionLine: {
    position: 'absolute',

    left: 95,

    right: 95,

    height: 1,

    backgroundColor: '#E5E5E5',
  },

  selectionLineTop: {
    top: 65 + 105,
  },

  selectionLineBottom: {
    top: 65 + 155,
  },

  // OPÇÕES
  option: {
    height: 75,
    borderTopWidth: 1,
    borderTopColor: '#F1F1F1',
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  optionTitle: {
    fontSize: 17,
    color: '#222',
  },

  optionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  optionValue: {
    fontSize: 16,
    color: '#A0A0A0',
  },

  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    justifyContent: 'flex-end',
  },

  feedModal: {
    height: 330,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    overflow: 'hidden',
  },
  feedModalHeader: {
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },

  feedModalTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#777',
  },

  feedWheelContainer: {
    height: 190,
    width: 100,
    alignSelf: 'center',
    overflow: 'hidden',
  },

  feedSelectionLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#E5E5E5',
  },

  feedSelectionLineTop: {
    top: 60 + 95,
  },

  feedSelectionLineBottom: {
    top: 60 + 145,
  },

  feedModalActions: {
    height: 65,
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },

  modalActionButton: {
    paddingHorizontal: 40,
    paddingVertical: 10,
  },

  cancelModalText: {
    fontSize: 16,
    color: '#555',
  },

  confirmModalText: {
    fontSize: 16,
    color: '#00B894',
    fontWeight: '600',
  },
});
