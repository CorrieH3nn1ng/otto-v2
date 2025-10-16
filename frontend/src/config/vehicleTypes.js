// Vehicle types with their typical equipment requirements
export const vehicleTypes = [
  {
    value: '1 Ton',
    label: '1 Ton',
    equipment: {
      straps: true,
      chains: false,
      tarpaulin: false,
      corner_plates: false,
      uprights: false,
      rubber_protection: false,
    }
  },
  {
    value: '2 Ton',
    label: '2 Ton',
    equipment: {
      straps: true,
      chains: false,
      tarpaulin: false,
      corner_plates: false,
      uprights: false,
      rubber_protection: false,
    }
  },
  {
    value: '4 Ton',
    label: '4 Ton',
    equipment: {
      straps: true,
      chains: false,
      tarpaulin: true,
      corner_plates: false,
      uprights: false,
      rubber_protection: false,
    }
  },
  {
    value: '5 Ton',
    label: '5 Ton',
    equipment: {
      straps: true,
      chains: false,
      tarpaulin: true,
      corner_plates: false,
      uprights: false,
      rubber_protection: false,
    }
  },
  {
    value: '6 Ton',
    label: '6 Ton',
    equipment: {
      straps: true,
      chains: false,
      tarpaulin: true,
      corner_plates: false,
      uprights: false,
      rubber_protection: false,
    }
  },
  {
    value: '8 Ton',
    label: '8 Ton',
    equipment: {
      straps: true,
      chains: true,
      tarpaulin: true,
      corner_plates: false,
      uprights: false,
      rubber_protection: true,
    }
  },
  {
    value: '10 Ton',
    label: '10 Ton',
    equipment: {
      straps: true,
      chains: true,
      tarpaulin: true,
      corner_plates: false,
      uprights: false,
      rubber_protection: true,
    }
  },
  {
    value: '12 Ton',
    label: '12 Ton',
    equipment: {
      straps: true,
      chains: true,
      tarpaulin: true,
      corner_plates: true,
      uprights: false,
      rubber_protection: true,
    }
  },
  {
    value: '13 Ton',
    label: '13 Ton',
    equipment: {
      straps: true,
      chains: true,
      tarpaulin: true,
      corner_plates: true,
      uprights: false,
      rubber_protection: true,
    }
  },
  {
    value: '15 Ton',
    label: '15 Ton',
    equipment: {
      straps: true,
      chains: true,
      tarpaulin: true,
      corner_plates: true,
      uprights: false,
      rubber_protection: true,
    }
  },
  {
    value: 'Tri-Axle',
    label: 'Tri-Axle',
    equipment: {
      straps: true,
      chains: true,
      tarpaulin: true,
      corner_plates: true,
      uprights: false,
      rubber_protection: true,
    }
  },
  {
    value: "20' GP Container",
    label: "20' GP Container",
    equipment: {
      straps: false,
      chains: false,
      tarpaulin: false,
      corner_plates: false,
      uprights: false,
      rubber_protection: false,
    }
  },
  {
    value: "40' GP Container",
    label: "40' GP Container",
    equipment: {
      straps: false,
      chains: false,
      tarpaulin: false,
      corner_plates: false,
      uprights: false,
      rubber_protection: false,
    }
  },
  {
    value: "40' HC Container",
    label: "40' HC Container",
    equipment: {
      straps: false,
      chains: false,
      tarpaulin: false,
      corner_plates: false,
      uprights: false,
      rubber_protection: false,
    }
  },
  {
    value: "20' Open Top – In Gauge",
    label: "20' Open Top – In Gauge",
    equipment: {
      straps: true,
      chains: false,
      tarpaulin: true,
      corner_plates: false,
      uprights: false,
      rubber_protection: false,
    }
  },
  {
    value: "20' Open Top – Out of Gauge",
    label: "20' Open Top – Out of Gauge",
    equipment: {
      straps: true,
      chains: true,
      tarpaulin: true,
      corner_plates: true,
      uprights: false,
      rubber_protection: true,
    }
  },
  {
    value: "40' Open Top – In Gauge",
    label: "40' Open Top – In Gauge",
    equipment: {
      straps: true,
      chains: false,
      tarpaulin: true,
      corner_plates: false,
      uprights: false,
      rubber_protection: false,
    }
  },
  {
    value: "40' Open Top – Out of Gauge",
    label: "40' Open Top – Out of Gauge",
    equipment: {
      straps: true,
      chains: true,
      tarpaulin: true,
      corner_plates: true,
      uprights: false,
      rubber_protection: true,
    }
  },
  {
    value: "20' Flat Rack – In Gauge",
    label: "20' Flat Rack – In Gauge",
    equipment: {
      straps: true,
      chains: true,
      tarpaulin: false,
      corner_plates: true,
      uprights: false,
      rubber_protection: true,
    }
  },
  {
    value: "20' Flat Rack – Out of Gauge",
    label: "20' Flat Rack – Out of Gauge",
    equipment: {
      straps: true,
      chains: true,
      tarpaulin: true,
      corner_plates: true,
      uprights: false,
      rubber_protection: true,
    }
  },
  {
    value: "40' Flat Rack – In Gauge",
    label: "40' Flat Rack – In Gauge",
    equipment: {
      straps: true,
      chains: true,
      tarpaulin: false,
      corner_plates: true,
      uprights: false,
      rubber_protection: true,
    }
  },
  {
    value: "40' Flat Rack – Out of Gauge",
    label: "40' Flat Rack – Out of Gauge",
    equipment: {
      straps: true,
      chains: true,
      tarpaulin: true,
      corner_plates: true,
      uprights: false,
      rubber_protection: true,
    }
  },
  {
    value: 'Superlink',
    label: 'Superlink',
    equipment: {
      straps: true,
      chains: true,
      tarpaulin: true,
      corner_plates: true,
      uprights: true,
      rubber_protection: true,
    }
  },
  {
    value: 'Abnormal',
    label: 'Abnormal',
    equipment: {
      straps: true,
      chains: true,
      tarpaulin: true,
      corner_plates: true,
      uprights: true,
      rubber_protection: true,
    }
  },
];

// Equipment labels for display
export const equipmentLabels = {
  straps: 'Straps',
  chains: 'Chains',
  tarpaulin: 'Tarpaulin',
  corner_plates: 'Corner Plates',
  uprights: 'Uprights',
  rubber_protection: 'Rubber Protection',
};

// Get equipment requirements for a vehicle type
export const getEquipmentForVehicleType = (vehicleType) => {
  const vehicle = vehicleTypes.find(v => v.value === vehicleType);
  return vehicle ? vehicle.equipment : {
    straps: false,
    chains: false,
    tarpaulin: false,
    corner_plates: false,
    uprights: false,
    rubber_protection: false,
  };
};
