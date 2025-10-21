import React from "react";
import styles from "./Profile.module.css";

const ProofileItem = ({
  timetable,
  remoteDays,
  lookingFor,
  readOnly = false,
  selectedDay,
  onSelectDay,
  startTime,
  endTime,
  onChangeStartTime,
  onChangeEndTime,
  onSaveTimeRange,
  onCancelSelectDay,
  onToggleRemoteDay,
  onChangeLookingFor,
}) => {
  // Define the correct order of days starting with Monday
  const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  
  // French day names mapping
  const frenchDays = {
    'Monday': 'Lundi',
    'Tuesday': 'Mardi', 
    'Wednesday': 'Mercredi',
    'Thursday': 'Jeudi',
    'Friday': 'Vendredi',
    'Saturday': 'Samedi',
    'Sunday': 'Dimanche'
  };
  
  // French day abbreviations for remote work
  const frenchDayAbbr = {
    'Monday': 'Lun',
    'Tuesday': 'Mar',
    'Wednesday': 'Mer',
    'Thursday': 'Jeu',
    'Friday': 'Ven',
    'Saturday': 'Sam',
    'Sunday': 'Dim'
  };

  return (
    <>
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Disponibilité</h2>

        <div className={styles.subSection}>
          <h3 className={styles.subTitle}>Libre sous réserve</h3>
          <div className={styles.timetable}>
            {dayOrder.map((day) => (
              <div
                key={day}
                className={`${styles.timetableDay} ${day === 'Sunday' ? styles.sunday : ''}`}
                onClick={readOnly ? undefined : () => onSelectDay && onSelectDay(day)}
                style={{ cursor: readOnly ? "default" : "pointer" }}
              >
                <h4>{frenchDays[day]}</h4>
                <p>
                  {timetable[day]?.start
                    ? `${timetable[day].start} - ${timetable[day].end}`
                    : "XX:XX"}
                </p>
              </div>
            ))}
          </div>
        </div>

        {!readOnly && selectedDay && (
          <div className={styles.timeRangePickerModal}>
            <div className={styles.timeRangePicker}>
              <h4>Définir les heures pour {frenchDays[selectedDay]}</h4>
              <input
                type="time"
                value={startTime}
                onChange={(e) => onChangeStartTime && onChangeStartTime(e.target.value)}
              />
              <input
                type="time"
                value={endTime}
                onChange={(e) => onChangeEndTime && onChangeEndTime(e.target.value)}
              />
              <div className={styles.buttonContainer}>
                <button onClick={onSaveTimeRange}>Sauvegarder</button>
                <button onClick={onCancelSelectDay}>Annuler</button>
              </div>
            </div>
          </div>
        )}

        <div className={styles.subSection}>
          <h3 className={styles.subTitle}>Télétravail</h3>
          <div className={styles.remoteWorkSection}>
            <div className={styles.remoteDaysBar}>
              {dayOrder.map((day) => (
                <div
                  key={day}
                  className={`${styles.remoteDay} ${day === 'Sunday' ? styles.sunday : ''} ${remoteDays[day] ? styles.active : ""} ${!readOnly && selectedDay !== null ? styles.disabled : ""}`}
                  onClick={readOnly ? undefined : () => onToggleRemoteDay && onToggleRemoteDay(day)}
                >
                  {frenchDayAbbr[day]}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Description : ce que je veux, lien utile ...</h2>
        {readOnly ? (
          <div className={styles.lookingForInput} style={{ whiteSpace: "pre-wrap" }}>
            {lookingFor || "—"}
          </div>
        ) : (
          <textarea
            value={lookingFor}
            onChange={(e) => onChangeLookingFor && onChangeLookingFor(e.target.value)}
            className={styles.lookingForInput}
            placeholder="Décrivez ce que vous recherchez..."
            rows={4}
          />
        )}
      </section>
    </>
  );
};

export default ProofileItem;
