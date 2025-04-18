export const ratingToProcentage = (rating) => {
    return (rating * 10)?.toFixed(0);
};

export const resolveRatingColor = (rating) =>{
    if(rating>=7){
        return "green.400";
    } else if (rating>=5){
        return "orange.400";
    } else {
        return "red.400";    
    }
};

export const minutesToHours=(minutes)=>{
    const hours=Math.floor(minutes/60);
    const mins=minutes%60;
    return `${hours}h ${mins}m`;
}

export const minutesToDaysHours=(minutes)=>{
    const days=Math.floor(minutes/(24*60));
    const hours=Math.floor((minutes%(24*60))/60);
    const mins=minutes%(24*60)%60;
    return `${days}d ${hours}h ${mins}m`;
}